import { Router } from "express";
import { db, transactionsTable, accountsTable, connectionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "../lib/auth";
import { likelyDirection } from "../lib/rules";
import { cuid } from "../lib/cuid";
import Papa from "papaparse";
import crypto from "crypto";

const router = Router();

router.post("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { csv, dateColumn, descriptionColumn, amountColumn, merchantColumn, accountColumn } = req.body as {
    csv: string;
    dateColumn: string;
    descriptionColumn: string;
    amountColumn: string;
    merchantColumn?: string;
    accountColumn?: string;
  };

  // Find or create CSV connection
  let conn = (await db.select().from(connectionsTable).where(and(eq(connectionsTable.householdId, user.householdId), eq(connectionsTable.provider, "csv"))).limit(1))[0];
  if (!conn) {
    [conn] = await db.insert(connectionsTable).values({ id: cuid(), householdId: user.householdId, provider: "csv", name: "CSV Imports" }).returning();
  }

  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  let imported = 0;

  for (const row of parsed.data) {
    const amount = Number(String(row[amountColumn] ?? "0").replace(/[$,]/g, ""));
    const description = row[descriptionColumn] ?? "";
    const date = new Date(row[dateColumn]);
    const accountName = (accountColumn ? row[accountColumn] : null) ?? "CSV Import";
    const fingerprint = crypto.createHash("sha256").update([accountName, date.toISOString().slice(0, 10), amount.toFixed(2), description].join("|")).digest("hex");

    // Upsert account
    let acct = (await db.select().from(accountsTable).where(and(eq(accountsTable.connectionId, conn.id), eq(accountsTable.providerAccountId, accountName))).limit(1))[0];
    if (!acct) {
      [acct] = await db.insert(accountsTable).values({ id: cuid(), connectionId: conn.id, providerAccountId: accountName, name: accountName, type: "import", currentBalance: "0", currency: "USD" }).returning();
    }

    // Upsert transaction
    const txId = `csv-${fingerprint}`;
    const existing = (await db.select({ id: transactionsTable.id }).from(transactionsTable).where(and(eq(transactionsTable.accountId, acct.id), eq(transactionsTable.providerTransactionId, txId))).limit(1))[0];
    if (!existing) {
      await db.insert(transactionsTable).values({
        id: cuid(),
        accountId: acct.id,
        providerTransactionId: txId,
        date,
        description,
        merchantName: merchantColumn ? row[merchantColumn] : null,
        originalDescription: description,
        amount: String(amount),
        direction: likelyDirection(amount),
      });
      imported++;
    }
  }

  return res.json({ imported });
});

export default router;
