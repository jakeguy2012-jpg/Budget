import { db, connectionsTable, accountsTable, transactionsTable, syncRunsTable, categoryRulesTable, auditLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { decryptSecret } from "./crypto";
import { ruleMatches, likelyDirection } from "./rules";
import { cuid } from "./cuid";
import { logger } from "./logger";
import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS } from "./mockSync";

// ── SimpleFIN API types ────────────────────────────────────────────────────
type SimpleFinAccount = {
  id: string;
  name: string;
  org?: { name?: string };
  currency?: string;
  balance?: string;
  "available-balance"?: string;
  extra?: { account_num?: string; account_type?: string };
  transactions?: Array<{
    id: string; posted: number; amount: string;
    description: string; payee?: string;
  }>;
};

interface ProviderAccount {
  providerAccountId: string;
  name: string;
  type: string;
  subtype?: string;
  mask?: string;
  currentBalance: number;
  currency: string;
}

interface ProviderTransaction {
  providerTransactionId: string;
  providerAccountId: string;
  date: Date;
  description: string;
  merchantName?: string;
  amount: number;
}

// ── Fetch from real SimpleFIN API ──────────────────────────────────────────
async function fetchSimpleFin(
  url: string,
  startDate?: Date,
  endDate?: Date,
): Promise<SimpleFinAccount[]> {
  const fetchUrl = new URL(url);
  if (startDate)
    fetchUrl.searchParams.set("start-date", Math.floor(startDate.getTime() / 1000).toString());
  if (endDate)
    fetchUrl.searchParams.set("end-date", Math.floor(endDate.getTime() / 1000).toString());

  const resp = await fetch(fetchUrl.toString(), { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error(`SimpleFIN error ${resp.status}: ${resp.statusText}`);
  const body = (await resp.json()) as { accounts?: SimpleFinAccount[] };
  return body.accounts ?? [];
}

// ── Build provider data from real SimpleFIN response ──────────────────────
function providerDataFromSimpleFin(rawAccounts: SimpleFinAccount[]): {
  accounts: ProviderAccount[];
  transactions: ProviderTransaction[];
} {
  const accounts: ProviderAccount[] = rawAccounts.map((a) => ({
    providerAccountId: a.id,
    name: a.name,
    type: a.extra?.account_type ?? "depository",
    subtype: a.extra?.account_type,
    mask: a.extra?.account_num ? a.extra.account_num.slice(-4) : undefined,
    currentBalance: Number(a.balance ?? 0),
    currency: a.currency ?? "USD",
  }));

  const transactions: ProviderTransaction[] = rawAccounts.flatMap((ra) =>
    (ra.transactions ?? []).map((tx) => ({
      providerTransactionId: tx.id,
      providerAccountId: ra.id,
      date: new Date(tx.posted * 1000),
      description: tx.description,
      merchantName: tx.payee,
      amount: Number(tx.amount),
    })),
  );

  return { accounts, transactions };
}

// ── Build provider data from mock data ────────────────────────────────────
function providerDataFromMock(
  startDate?: Date,
  endDate?: Date,
): { accounts: ProviderAccount[]; transactions: ProviderTransaction[] } {
  const accounts: ProviderAccount[] = MOCK_ACCOUNTS;
  let transactions = MOCK_TRANSACTIONS;
  if (startDate) transactions = transactions.filter((t) => t.date >= startDate);
  if (endDate) transactions = transactions.filter((t) => t.date <= endDate);
  return { accounts, transactions };
}

// ── Upsert accounts and transactions ──────────────────────────────────────
async function upsertProviderData(
  connectionId: string,
  householdId: string,
  accounts: ProviderAccount[],
  transactions: ProviderTransaction[],
  rules: typeof categoryRulesTable.$inferSelect[],
): Promise<{ inserted: number; updated: number; accountsSynced: number }> {
  for (const acct of accounts) {
    const existing = await db
      .select({ id: accountsTable.id })
      .from(accountsTable)
      .where(
        and(
          eq(accountsTable.connectionId, connectionId),
          eq(accountsTable.providerAccountId, acct.providerAccountId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(accountsTable)
        .set({
          name: acct.name,
          currentBalance: String(acct.currentBalance),
          currency: acct.currency,
          isActive: true,
        })
        .where(eq(accountsTable.id, existing[0].id));
    } else {
      await db.insert(accountsTable).values({
        id: cuid(),
        connectionId,
        providerAccountId: acct.providerAccountId,
        name: acct.name,
        type: acct.type,
        subtype: acct.subtype ?? null,
        mask: acct.mask ?? null,
        currentBalance: String(acct.currentBalance),
        currency: acct.currency,
      });
    }
  }

  const dbAccounts = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.connectionId, connectionId));
  const accountByProviderId = new Map(dbAccounts.map((a) => [a.providerAccountId, a]));

  let inserted = 0;
  let updated = 0;

  for (const tx of transactions) {
    const acct = accountByProviderId.get(tx.providerAccountId);
    if (!acct) continue;

    const matchedRule = rules.find((r) =>
      ruleMatches(r, { ...tx, accountId: acct.id, amount: String(tx.amount) }),
    );

    const existing = await db
      .select({ id: transactionsTable.id })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.accountId, acct.id),
          eq(transactionsTable.providerTransactionId, tx.providerTransactionId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(transactionsTable)
        .set({
          date: tx.date,
          description: tx.description,
          merchantName: tx.merchantName ?? null,
          amount: String(tx.amount),
        })
        .where(eq(transactionsTable.id, existing[0].id));
      updated++;
    } else {
      await db.insert(transactionsTable).values({
        id: cuid(),
        accountId: acct.id,
        providerTransactionId: tx.providerTransactionId,
        date: tx.date,
        description: tx.description,
        merchantName: tx.merchantName ?? null,
        amount: String(tx.amount),
        direction: likelyDirection(tx.amount),
        categoryId: matchedRule?.categoryId ?? null,
        excludedFromBudget: matchedRule?.excludeFromBudget ?? false,
      });
      inserted++;
    }
  }

  return { inserted, updated, accountsSynced: accounts.length };
}

// ── Main sync entry point ──────────────────────────────────────────────────
export async function syncConnection(
  connectionId: string,
  startDate: Date,
  endDate: Date,
) {
  const [conn] = await db
    .select()
    .from(connectionsTable)
    .where(eq(connectionsTable.id, connectionId))
    .limit(1);
  if (!conn) throw new Error("Connection not found");

  const [run] = await db
    .insert(syncRunsTable)
    .values({ id: cuid(), connectionId, provider: conn.provider, status: "running" })
    .returning();

  await db.insert(auditLogsTable).values({
    id: cuid(),
    householdId: conn.householdId,
    action: "sync_started",
    entityType: "FinancialConnection",
    entityId: connectionId,
    metadata: {},
  });

  try {
    const syncProvider = process.env["BANK_SYNC_PROVIDER"] ?? "simplefin";
    const isMock = syncProvider === "mock" || conn.provider === "demo";

    logger.info(
      { connectionId, provider: isMock ? "mock" : "simplefin" },
      "Starting sync",
    );

    let providerData: { accounts: ProviderAccount[]; transactions: ProviderTransaction[] };

    if (isMock) {
      providerData = providerDataFromMock(startDate, endDate);
    } else {
      if (!conn.encryptedCredentials) throw new Error("Connection missing credentials");
      // Credentials decrypted in memory only — never logged
      const accessUrl = decryptSecret(conn.encryptedCredentials);
      const rawAccounts = await fetchSimpleFin(accessUrl, startDate, endDate);
      providerData = providerDataFromSimpleFin(rawAccounts);
    }

    const rules = await db
      .select()
      .from(categoryRulesTable)
      .where(
        and(
          eq(categoryRulesTable.householdId, conn.householdId),
          eq(categoryRulesTable.isActive, true),
        ),
      )
      .orderBy(categoryRulesTable.priority);

    const { inserted, updated, accountsSynced } = await upsertProviderData(
      connectionId,
      conn.householdId,
      providerData.accounts,
      providerData.transactions,
      rules,
    );

    await db
      .update(connectionsTable)
      .set({ lastSyncedAt: new Date() })
      .where(eq(connectionsTable.id, connectionId));

    await db
      .update(syncRunsTable)
      .set({
        status: "completed",
        endedAt: new Date(),
        accountsSynced: String(accountsSynced),
        transactionsInserted: String(inserted),
        transactionsUpdated: String(updated),
      })
      .where(eq(syncRunsTable.id, run.id));

    await db.insert(auditLogsTable).values({
      id: cuid(),
      householdId: conn.householdId,
      action: "sync_completed",
      entityType: "FinancialConnection",
      entityId: connectionId,
      metadata: { inserted, updated, accountsSynced },
    });

    logger.info({ connectionId, inserted, updated, accountsSynced }, "Sync completed");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await db
      .update(syncRunsTable)
      .set({ status: "failed", endedAt: new Date(), errorMessage: message })
      .where(eq(syncRunsTable.id, run.id));

    await db.insert(auditLogsTable).values({
      id: cuid(),
      householdId: conn.householdId,
      action: "sync_failed",
      entityType: "FinancialConnection",
      entityId: connectionId,
      metadata: { error: message },
    });

    logger.error({ connectionId, err: message }, "Sync failed");
    throw err;
  }
}
