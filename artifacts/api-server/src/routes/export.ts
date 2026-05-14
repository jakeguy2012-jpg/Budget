import { Router } from "express";
import {
  db, transactionsTable, categoriesTable, accountsTable,
  connectionsTable, budgetsTable, householdsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "../lib/auth";
import { startOfMonth } from "date-fns";

const router = Router();

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  return [
    keys.join(","),
    ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(",")),
  ].join("\n");
}

router.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const type = req.query["type"] as string;

  // ── Budgets CSV ──────────────────────────────────────────────────────────
  if (type === "budgets") {
    const rows = await db
      .select({ month: budgetsTable.month, categoryName: categoriesTable.name, planned: budgetsTable.planned })
      .from(budgetsTable)
      .innerJoin(categoriesTable, eq(budgetsTable.categoryId, categoriesTable.id))
      .where(eq(budgetsTable.householdId, user.householdId));

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="budgets.csv"');
    return res.send(
      toCsv(rows.map((b) => ({
        month: b.month.toISOString().slice(0, 7),
        category: b.categoryName,
        planned_usd: b.planned,
      }))),
    );
  }

  // ── Household JSON ───────────────────────────────────────────────────────
  // NOTE: encryptedCredentials are intentionally excluded from this export.
  // Never export raw secrets or credentials.
  if (type === "json") {
    const [household] = await db
      .select({ id: householdsTable.id, name: householdsTable.name, createdAt: householdsTable.createdAt })
      .from(householdsTable)
      .where(eq(householdsTable.id, user.householdId))
      .limit(1);

    const categories = await db
      .select({ id: categoriesTable.id, name: categoriesTable.name, color: categoriesTable.color, isDefault: categoriesTable.isDefault })
      .from(categoriesTable)
      .where(eq(categoriesTable.householdId, user.householdId));

    // Scrub credentials from connections export
    const connections = await db
      .select({
        id: connectionsTable.id,
        name: connectionsTable.name,
        provider: connectionsTable.provider,
        isActive: connectionsTable.isActive,
        lastSyncedAt: connectionsTable.lastSyncedAt,
        // encryptedCredentials intentionally omitted
      })
      .from(connectionsTable)
      .where(eq(connectionsTable.householdId, user.householdId));

    res.setHeader("Content-Disposition", 'attachment; filename="household.json"');
    return res.json({
      exportedAt: new Date().toISOString(),
      household,
      categories,
      connections,
      // encryptedCredentials never included
    });
  }

  // ── Transactions CSV (default) ───────────────────────────────────────────
  const connections = await db
    .select({ id: connectionsTable.id })
    .from(connectionsTable)
    .where(eq(connectionsTable.householdId, user.householdId));

  const allTxs: Array<Record<string, unknown>> = [];
  for (const conn of connections) {
    const accts = await db
      .select({ id: accountsTable.id })
      .from(accountsTable)
      .where(eq(accountsTable.connectionId, conn.id));

    for (const acct of accts) {
      const txs = await db
        .select({
          date: transactionsTable.date,
          accountName: accountsTable.name,
          merchant: transactionsTable.merchantName,
          description: transactionsTable.description,
          amount: transactionsTable.amount,
          direction: transactionsTable.direction,
          categoryName: categoriesTable.name,
          reviewed: transactionsTable.userReviewed,
          notes: transactionsTable.notes,
        })
        .from(transactionsTable)
        .innerJoin(accountsTable, eq(transactionsTable.accountId, accountsTable.id))
        .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
        .where(eq(transactionsTable.accountId, acct.id));

      allTxs.push(
        ...txs.map((t) => ({
          date: t.date.toISOString().slice(0, 10),
          account: t.accountName,
          merchant: t.merchant,
          description: t.description,
          amount: t.amount,
          direction: t.direction,
          category: t.categoryName,
          reviewed: t.reviewed,
          notes: t.notes,
        })),
      );
    }
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="transactions.csv"');
  return res.send(toCsv(allTxs));
});

export default router;
