import { Router } from "express";
import { db, transactionsTable, categoriesTable, accountsTable, connectionsTable } from "@workspace/db";
import { eq, and, isNull, ilike, or, desc } from "drizzle-orm";
import { getCurrentUser } from "../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { q, uncategorized, category, account, limit } = req.query as Record<string, string>;

  const connections = await db.select({ id: connectionsTable.id }).from(connectionsTable).where(eq(connectionsTable.householdId, user.householdId));
  const connectionIds = connections.map((c) => c.id);

  let accountIds: string[] = [];
  for (const cid of connectionIds) {
    const accts = await db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.connectionId, cid));
    accountIds.push(...accts.map((a) => a.id));
  }

  if (accountIds.length === 0) return res.json([]);

  const allTxs = [];
  for (const aid of accountIds) {
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
      .where(eq(transactionsTable.accountId, aid))
      .orderBy(desc(transactionsTable.date))
      .limit(Number(limit ?? 500));
    allTxs.push(...txs);
  }

  let filtered = allTxs;
  if (q) {
    const lower = q.toLowerCase();
    filtered = filtered.filter((t) =>
      (t.description ?? "").toLowerCase().includes(lower) ||
      (t.merchantName ?? "").toLowerCase().includes(lower)
    );
  }
  if (uncategorized) filtered = filtered.filter((t) => !t.categoryId);
  if (category) filtered = filtered.filter((t) => t.categoryId === category);
  if (account) filtered = filtered.filter((t) => t.accountId === account);

  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const limited = filtered.slice(0, Number(limit ?? 200));

  return res.json(limited.map((t) => ({
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
  })));
});

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
    const accts = await db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.connectionId, cid));
    authorizedAccountIds.push(...accts.map((a) => a.id));
  }

  if (authorizedAccountIds.length === 0) return res.status(404).json({ error: "Not found" });

  // Verify the transaction belongs to one of the household's accounts
  const existing = await db
    .select({ id: transactionsTable.id, accountId: transactionsTable.accountId })
    .from(transactionsTable)
    .where(eq(transactionsTable.id, id))
    .limit(1);

  if (!existing[0] || !authorizedAccountIds.includes(existing[0].accountId)) {
    return res.status(404).json({ error: "Not found" });
  }

  const { categoryId, userReviewed, notes, excludedFromBudget } = req.body as {
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
  const account = await db.select().from(accountsTable).where(eq(accountsTable.id, updated.accountId)).limit(1);

  return res.json({
    ...updated,
    date: updated.date.toISOString(),
    categoryName: category[0]?.name ?? null,
    categoryColor: category[0]?.color ?? null,
    accountName: account[0]?.name ?? "",
  });
});

export default router;
