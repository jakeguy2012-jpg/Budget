import { db, connectionsTable, accountsTable, transactionsTable, syncRunsTable, categoryRulesTable, auditLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { decryptSecret } from "./crypto";
import { ruleMatches, likelyDirection } from "./rules";
import { cuid } from "./cuid";

interface ProviderAccount {
  providerAccountId: string;
  name: string;
  officialName?: string;
  type: string;
  subtype?: string;
  mask?: string;
  currentBalance: number;
  availableBalance?: number;
  currency: string;
}

interface ProviderTransaction {
  providerTransactionId: string;
  providerAccountId: string;
  date: Date;
  postedDate?: Date;
  description: string;
  merchantName?: string;
  originalDescription?: string;
  amount: number;
}

type SimpleFinAccount = {
  id: string;
  name: string;
  org?: { name?: string };
  currency?: string;
  balance?: string;
  "available-balance"?: string;
  extra?: { account_num?: string; account_type?: string };
  transactions?: Array<{ id: string; posted: number; amount: string; description: string; payee?: string }>;
};

async function fetchSimpleFin(url: string, startDate?: Date, endDate?: Date): Promise<SimpleFinAccount[]> {
  const fetchUrl = new URL(url);
  if (startDate) fetchUrl.searchParams.set("start-date", Math.floor(startDate.getTime() / 1000).toString());
  if (endDate) fetchUrl.searchParams.set("end-date", Math.floor(endDate.getTime() / 1000).toString());
  const resp = await fetch(fetchUrl.toString(), { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error(`SimpleFIN error ${resp.status}`);
  const body = await resp.json() as { accounts?: SimpleFinAccount[] };
  return body.accounts ?? [];
}

export async function syncConnection(connectionId: string, startDate: Date, endDate: Date) {
  const [conn] = await db.select().from(connectionsTable).where(eq(connectionsTable.id, connectionId)).limit(1);
  if (!conn || !conn.encryptedCredentials) throw new Error("Connection not found or missing credentials");

  const [run] = await db.insert(syncRunsTable).values({ id: cuid(), connectionId, provider: conn.provider, status: "running" }).returning();
  await db.insert(auditLogsTable).values({ id: cuid(), householdId: conn.householdId, action: "sync_started", entityType: "FinancialConnection", entityId: connectionId, metadata: {} });

  try {
    const accessUrl = decryptSecret(conn.encryptedCredentials);
    const rawAccounts = await fetchSimpleFin(accessUrl, startDate, endDate);

    const providerAccounts: ProviderAccount[] = rawAccounts.map((a) => ({
      providerAccountId: a.id,
      name: a.name,
      officialName: a.org?.name,
      type: a.extra?.account_type ?? "depository",
      subtype: a.extra?.account_type,
      mask: a.extra?.account_num ? a.extra.account_num.slice(-4) : undefined,
      currentBalance: Number(a.balance ?? 0),
      availableBalance: a["available-balance"] ? Number(a["available-balance"]) : undefined,
      currency: a.currency ?? "USD",
    }));

    for (const acct of providerAccounts) {
      const existing = await db.select({ id: accountsTable.id }).from(accountsTable).where(and(eq(accountsTable.connectionId, connectionId), eq(accountsTable.providerAccountId, acct.providerAccountId))).limit(1);
      if (existing[0]) {
        await db.update(accountsTable).set({ name: acct.name, currentBalance: String(acct.currentBalance), currency: acct.currency, isActive: true }).where(eq(accountsTable.id, existing[0].id));
      } else {
        await db.insert(accountsTable).values({ id: cuid(), connectionId, ...acct, currentBalance: String(acct.currentBalance), availableBalance: acct.availableBalance ? String(acct.availableBalance) : null });
      }
    }

    const dbAccounts = await db.select().from(accountsTable).where(eq(accountsTable.connectionId, connectionId));
    const accountByProviderId = new Map(dbAccounts.map((a) => [a.providerAccountId, a]));

    const rules = await db.select().from(categoryRulesTable).where(and(eq(categoryRulesTable.householdId, conn.householdId), eq(categoryRulesTable.isActive, true))).orderBy(categoryRulesTable.priority);

    const providerTransactions: ProviderTransaction[] = rawAccounts.flatMap((ra) =>
      (ra.transactions ?? []).map((tx) => ({
        providerTransactionId: tx.id,
        providerAccountId: ra.id,
        date: new Date(tx.posted * 1000),
        postedDate: new Date(tx.posted * 1000),
        description: tx.description,
        merchantName: tx.payee,
        originalDescription: tx.description,
        amount: Number(tx.amount),
      }))
    );

    let inserted = 0;
    let updated = 0;

    for (const tx of providerTransactions) {
      const acct = accountByProviderId.get(tx.providerAccountId);
      if (!acct) continue;
      const matchedRule = rules.find((r) => ruleMatches(r, { ...tx, accountId: acct.id, amount: String(tx.amount) }));
      const existing = await db.select({ id: transactionsTable.id }).from(transactionsTable).where(and(eq(transactionsTable.accountId, acct.id), eq(transactionsTable.providerTransactionId, tx.providerTransactionId))).limit(1);

      if (existing[0]) {
        await db.update(transactionsTable).set({ date: tx.date, description: tx.description, merchantName: tx.merchantName, amount: String(tx.amount) }).where(eq(transactionsTable.id, existing[0].id));
        updated++;
      } else {
        await db.insert(transactionsTable).values({
          id: cuid(),
          accountId: acct.id,
          providerTransactionId: tx.providerTransactionId,
          date: tx.date,
          postedDate: tx.postedDate,
          description: tx.description,
          merchantName: tx.merchantName,
          originalDescription: tx.originalDescription,
          amount: String(tx.amount),
          direction: likelyDirection(tx.amount),
          categoryId: matchedRule?.categoryId ?? null,
          excludedFromBudget: matchedRule?.excludeFromBudget ?? false,
        });
        inserted++;
      }
    }

    await db.update(connectionsTable).set({ lastSyncedAt: new Date() }).where(eq(connectionsTable.id, connectionId));
    await db.update(syncRunsTable).set({ status: "completed", endedAt: new Date(), accountsSynced: String(providerAccounts.length), transactionsInserted: String(inserted), transactionsUpdated: String(updated) }).where(eq(syncRunsTable.id, run.id));
    await db.insert(auditLogsTable).values({ id: cuid(), householdId: conn.householdId, action: "sync_completed", entityType: "FinancialConnection", entityId: connectionId, metadata: { inserted, updated } });
  } catch (err) {
    await db.update(syncRunsTable).set({ status: "failed", endedAt: new Date(), errorMessage: err instanceof Error ? err.message : "Unknown error" }).where(eq(syncRunsTable.id, run.id));
    await db.insert(auditLogsTable).values({ id: cuid(), householdId: conn.householdId, action: "sync_failed", entityType: "FinancialConnection", entityId: connectionId, metadata: {} });
    throw err;
  }
}
