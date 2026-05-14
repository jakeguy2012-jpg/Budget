import { Router } from "express";
import { db, transactionsTable, budgetsTable, categoriesTable, accountsTable, connectionsTable } from "@workspace/db";
import { eq, gte, and, isNull, isNotNull } from "drizzle-orm";
import { getCurrentUser } from "../lib/auth";
import { startOfMonth, subMonths } from "date-fns";

const router = Router();

router.get("/summary", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const monthStart = startOfMonth(new Date());
  const priorStart = startOfMonth(subMonths(new Date(), 1));

  const connections = await db
    .select({ id: connectionsTable.id })
    .from(connectionsTable)
    .where(eq(connectionsTable.householdId, user.householdId));
  const connectionIds = connections.map((c) => c.id);

  if (connectionIds.length === 0) {
    const budgets = await db
      .select({ id: budgetsTable.id, categoryId: budgetsTable.categoryId, month: budgetsTable.month, planned: budgetsTable.planned, categoryName: categoriesTable.name, categoryColor: categoriesTable.color })
      .from(budgetsTable)
      .innerJoin(categoriesTable, eq(budgetsTable.categoryId, categoriesTable.id))
      .where(and(eq(budgetsTable.householdId, user.householdId), gte(budgetsTable.month, monthStart)));
    return res.json({ spending: 0, income: 0, netCashFlow: 0, uncategorizedCount: 0, byCategory: [], byAccount: [], budgets: budgets.map(b => ({ id: b.id, categoryId: b.categoryId, categoryName: b.categoryName, categoryColor: b.categoryColor, month: b.month.toISOString(), planned: b.planned })) });
  }

  const accounts = await db
    .select({ id: accountsTable.id, name: accountsTable.name })
    .from(accountsTable)
    .where(eq(accountsTable.connectionId, connectionIds[0]));

  const allAccounts: typeof accounts = [];
  for (const cid of connectionIds) {
    const accts = await db.select({ id: accountsTable.id, name: accountsTable.name }).from(accountsTable).where(eq(accountsTable.connectionId, cid));
    allAccounts.push(...accts);
  }
  const accountIds = allAccounts.map((a) => a.id);
  const accountMap = new Map(allAccounts.map((a) => [a.id, a.name]));

  const transactions = accountIds.length === 0 ? [] : await db
    .select({
      id: transactionsTable.id,
      date: transactionsTable.date,
      amount: transactionsTable.amount,
      direction: transactionsTable.direction,
      categoryId: transactionsTable.categoryId,
      accountId: transactionsTable.accountId,
      excludedFromBudget: transactionsTable.excludedFromBudget,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
    .where(and(
      eq(transactionsTable.accountId, accountIds[0]),
      gte(transactionsTable.date, priorStart),
    ));

  const allTxs: typeof transactions = [];
  for (const aid of accountIds) {
    const txs = await db
      .select({
        id: transactionsTable.id,
        date: transactionsTable.date,
        amount: transactionsTable.amount,
        direction: transactionsTable.direction,
        categoryId: transactionsTable.categoryId,
        accountId: transactionsTable.accountId,
        excludedFromBudget: transactionsTable.excludedFromBudget,
        categoryName: categoriesTable.name,
        categoryColor: categoriesTable.color,
      })
      .from(transactionsTable)
      .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
      .where(and(eq(transactionsTable.accountId, aid), gte(transactionsTable.date, priorStart)));
    allTxs.push(...txs);
  }

  const current = allTxs.filter((t) => t.date >= monthStart && !t.excludedFromBudget);
  const spending = current.filter((t) => t.direction === "expense").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const income = current.filter((t) => t.direction === "income").reduce((s, t) => s + Number(t.amount), 0);

  const byCategoryMap = new Map<string, { name: string; value: number; color: string }>();
  for (const t of current.filter((t) => t.direction === "expense")) {
    const name = t.categoryName ?? "Uncategorized";
    const existing = byCategoryMap.get(name);
    if (existing) {
      existing.value += Math.abs(Number(t.amount));
    } else {
      byCategoryMap.set(name, { name, value: Math.abs(Number(t.amount)), color: t.categoryColor ?? "#64748b" });
    }
  }

  const byAccountMap = new Map<string, { name: string; value: number }>();
  for (const t of current) {
    const name = accountMap.get(t.accountId) ?? "Unknown";
    const existing = byAccountMap.get(name);
    if (existing) {
      existing.value += Math.abs(Number(t.amount));
    } else {
      byAccountMap.set(name, { name, value: Math.abs(Number(t.amount)) });
    }
  }

  const uncategorizedCount = current.filter((t) => !t.categoryId).length;

  const budgets = await db
    .select({ id: budgetsTable.id, categoryId: budgetsTable.categoryId, month: budgetsTable.month, planned: budgetsTable.planned, categoryName: categoriesTable.name, categoryColor: categoriesTable.color })
    .from(budgetsTable)
    .innerJoin(categoriesTable, eq(budgetsTable.categoryId, categoriesTable.id))
    .where(and(eq(budgetsTable.householdId, user.householdId), gte(budgetsTable.month, monthStart)));

  return res.json({
    spending,
    income,
    netCashFlow: income - spending,
    uncategorizedCount,
    byCategory: Array.from(byCategoryMap.values()),
    byAccount: Array.from(byAccountMap.values()),
    budgets: budgets.map((b) => ({
      id: b.id,
      categoryId: b.categoryId,
      categoryName: b.categoryName,
      categoryColor: b.categoryColor,
      month: b.month.toISOString(),
      planned: b.planned,
    })),
  });
});

export default router;
