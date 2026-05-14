import { Router } from "express";
import {
  db, transactionsTable, categoriesTable, accountsTable, connectionsTable,
} from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { getCurrentUser } from "../lib/auth";

const router = Router();

// ── GET /api/transactions ──────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const {
    q, uncategorized, category, account,
    dateFrom, dateTo, direction,
    limit,
  } = req.query as Record<string, string>;

  const connections = await db
    .select({ id: connectionsTable.id })
    .from(connectionsTable)
    .where(eq(connectionsTable.householdId, user.householdId));
  const connectionIds = connections.map((c) => c.id);

  if (connectionIds.length === 0) return res.json([]);

  let accountIds: string[] = [];
  for (const cid of connectionIds) {
    const accts = await db
      .select({ id: accountsTable.id })
      .from(accountsTable)
      .where(eq(accountsTable.connectionId, cid));
    accountIds.push(...accts.map((a) => a.id));
  }

  if (accountIds.length === 0) return res.json([]);

  // Filter to specific account if requested
  if (account) {
    accountIds = accountIds.filter((id) => id === account);
    if (accountIds.length === 0) return res.json([]);
  }

  const maxLimit = Math.min(Number(limit ?? 500), 1000);
  const allTxs: Array<{
    id: string; date: Date; description: string | null; merchantName: string | null;
    amount: string; direction: string; userReviewed: boolean; excludedFromBudget: boolean;
    notes: string | null; categoryId: string | null; accountId: string;
    accountName: string; categoryName: string | null; categoryColor: string | null;
  }> = [];

  for (const aid of accountIds) {
    const where = [eq(transactionsTable.accountId, aid)];
    if (dateFrom) where.push(gte(transactionsTable.date, new Date(dateFrom)));
    if (dateTo)   where.push(lte(transactionsTable.date, new Date(dateTo)));

    const txs = await db
      .select({
        id: transactionsTable.id,
        date: transactionsTable.date,
        description: transactionsTable.description,
        merchantName: transactionsTable.merchantName,
        amount: transactionsTable.amount,
        direction: transactionsTable.direction,
        userReviewed: transactionsTable.userReviewed,
        excludedFromBudget: transactionsTable.excludedFromBudget,
        notes: transactionsTable.notes,
        categoryId: transactionsTable.categoryId,
        accountId: transactionsTable.accountId,
        accountName: accountsTable.name,
        categoryName: categoriesTable.name,
        categoryColor: categoriesTable.color,
      })
      .from(transactionsTable)
      .innerJoin(accountsTable, eq(transactionsTable.accountId, accountsTable.id))
      .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
      .where(and(...where))
      .orderBy(desc(transactionsTable.date))
      .limit(maxLimit);
    allTxs.push(...txs);
  }

  let filtered = allTxs;

  // Text search
  if (q) {
    const lower = q.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        (t.description ?? "").toLowerCase().includes(lower) ||
        (t.merchantName ?? "").toLowerCase().includes(lower),
    );
  }

  // Category filters
  if (uncategorized) filtered = filtered.filter((t) => !t.categoryId);
  if (category)      filtered = filtered.filter((t) => t.categoryId === category);

  // Direction filter
  if (direction === "income")   filtered = filtered.filter((t) => t.direction === "income");
  if (direction === "expense")  filtered = filtered.filter((t) => t.direction === "expense");
  if (direction === "transfer") filtered = filtered.filter((t) => t.direction === "transfer");

  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const limited = filtered.slice(0, maxLimit);

  return res.json(
    limited.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      description: t.description,
      merchantName: t.merchantName,
      amount: t.amount,
      direction: t.direction,
      userReviewed: t.userReviewed,
      excludedFromBudget: t.excludedFromBudget,
      notes: t.notes,
      categoryId: t.categoryId,
      categoryName: t.categoryName,
      categoryColor: t.categoryColor,
      accountId: t.accountId,
      accountName: t.accountName,
    })),
  );
});

// ── PATCH /api/transactions/:id ────────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.params;

  // Enforce ownership: transaction → account → connection → household
  const connections = await db
    .select({ id: connectionsTable.id })
    .from(connectionsTable)
    .where(eq(connectionsTable.householdId, user.householdId));
  const connectionIds = connections.map((c) => c.id);

  const authorizedAccountIds: string[] = [];
  for (const cid of connectionIds) {
    const accts = await db
      .select({ id: accountsTable.id })
      .from(accountsTable)
      .where(eq(accountsTable.connectionId, cid));
    authorizedAccountIds.push(...accts.map((a) => a.id));
  }

  if (authorizedAccountIds.length === 0) return res.status(404).json({ error: "Not found" });

  const [existing] = await db
    .select({ id: transactionsTable.id, accountId: transactionsTable.accountId })
    .from(transactionsTable)
    .where(eq(transactionsTable.id, id))
    .limit(1);

  if (!existing || !authorizedAccountIds.includes(existing.accountId)) {
    return res.status(404).json({ error: "Not found" });
  }

  const {
    categoryId, userReviewed, notes, excludedFromBudget,
  } = req.body as {
    categoryId?: string | null;
    userReviewed?: boolean;
    notes?: string | null;
    excludedFromBudget?: boolean;
  };

  const updateData: Partial<typeof transactionsTable.$inferSelect> = {};
  if (categoryId !== undefined) updateData.categoryId = categoryId;
  if (userReviewed !== undefined) updateData.userReviewed = userReviewed;
  if (notes !== undefined) updateData.notes = notes;
  if (excludedFromBudget !== undefined) updateData.excludedFromBudget = excludedFromBudget;

  const [updated] = await db
    .update(transactionsTable)
    .set(updateData)
    .where(eq(transactionsTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });

  const category = updated.categoryId
    ? await db.select().from(categoriesTable).where(eq(categoriesTable.id, updated.categoryId)).limit(1)
    : [];
  const [acct] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.id, updated.accountId))
    .limit(1);

  return res.json({
    ...updated,
    date: updated.date.toISOString(),
    categoryName: category[0]?.name ?? null,
    categoryColor: category[0]?.color ?? null,
    accountName: acct?.name ?? "",
  });
});

export default router;
