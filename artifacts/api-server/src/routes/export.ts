import { Router } from "express";
import { db, transactionsTable, categoriesTable, accountsTable, connectionsTable, budgetsTable, householdsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "../lib/auth";
import { startOfMonth } from "date-fns";

const router = Router();

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  return [keys.join(","), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
}

router.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const type = req.query["type"] as string;

  if (type === "budgets") {
    const monthStart = startOfMonth(new Date());
    const rows = await db
      .select({ month: budgetsTable.month, categoryName: categoriesTable.name, planned: budgetsTable.planned })
      .from(budgetsTable)
      .innerJoin(categoriesTable, eq(budgetsTable.categoryId, categoriesTable.id))
      .where(eq(budgetsTable.householdId, user.householdId));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="budgets.csv"');
    return res.send(toCsv(rows.map((b) => ({ month: b.month.toISOString().slice(0, 7), category: b.categoryName, planned: b.planned }))));
  }

  if (type === "json") {
    const household = await db.select().from(householdsTable).where(eq(householdsTable.id, user.householdId)).limit(1);
    const categories = await db.select().from(categoriesTable).where(eq(categoriesTable.householdId, user.householdId));
    const connections = await db.select().from(connectionsTable).where(eq(connectionsTable.householdId, user.householdId));
    return res.json({ household: household[0], categories, connections });
  }

  // Default: transactions CSV
  const connections = await db.select({ id: connectionsTable.id }).from(connectionsTable).where(eq(connectionsTable.householdId, user.householdId));
  const allTxs = [];
  for (const conn of connections) {
    const accts = await db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.connectionId, conn.id));
    for (const acct of accts) {
      const txs = await db
        .select({ date: transactionsTable.date, accountName: accountsTable.name, merchant: transactionsTable.merchantName, description: transactionsTable.description, amount: transactionsTable.amount, categoryName: categoriesTable.name, reviewed: transactionsTable.userReviewed, notes: transactionsTable.notes })
        .from(transactionsTable)
        .innerJoin(accountsTable, eq(transactionsTable.accountId, accountsTable.id))
        .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
        .where(eq(transactionsTable.accountId, acct.id));
      allTxs.push(...txs);
    }
  }
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="transactions.csv"');
  return res.send(toCsv(allTxs.map((t) => ({ date: t.date.toISOString().slice(0, 10), account: t.accountName, merchant: t.merchant, description: t.description, amount: t.amount, category: t.categoryName, reviewed: t.reviewed, notes: t.notes }))));
});

export default router;
