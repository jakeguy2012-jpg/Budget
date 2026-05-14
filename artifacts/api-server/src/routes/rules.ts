import { Router } from "express";
import { db, categoryRulesTable, categoriesTable, transactionsTable, connectionsTable, accountsTable } from "@workspace/db";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { getCurrentUser } from "../lib/auth";
import { ruleMatches, likelyDirection } from "../lib/rules";
import { cuid } from "../lib/cuid";

const router = Router();

router.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rules = await db
    .select({
      id: categoryRulesTable.id,
      categoryId: categoryRulesTable.categoryId,
      merchantContains: categoryRulesTable.merchantContains,
      descriptionContains: categoryRulesTable.descriptionContains,
      priority: categoryRulesTable.priority,
      excludeFromBudget: categoryRulesTable.excludeFromBudget,
      isActive: categoryRulesTable.isActive,
      categoryName: categoriesTable.name,
    })
    .from(categoryRulesTable)
    .innerJoin(categoriesTable, eq(categoryRulesTable.categoryId, categoriesTable.id))
    .where(eq(categoryRulesTable.householdId, user.householdId))
    .orderBy(categoryRulesTable.priority);

  const categories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.householdId, user.householdId))
    .orderBy(categoriesTable.name);

  // Get top uncategorized merchants
  const connections = await db.select({ id: connectionsTable.id }).from(connectionsTable).where(eq(connectionsTable.householdId, user.householdId));
  const suggestions: Array<{ merchantName: string | null; count: number }> = [];

  if (connections.length > 0) {
    for (const conn of connections) {
      const accts = await db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.connectionId, conn.id));
      for (const acct of accts) {
        const txs = await db
          .select({ merchantName: transactionsTable.merchantName })
          .from(transactionsTable)
          .where(and(eq(transactionsTable.accountId, acct.id), isNull(transactionsTable.categoryId)));
        const counts = new Map<string, number>();
        for (const t of txs) {
          if (t.merchantName) {
            counts.set(t.merchantName, (counts.get(t.merchantName) ?? 0) + 1);
          }
        }
        for (const [merchantName, count] of counts) {
          suggestions.push({ merchantName, count });
        }
      }
    }
    suggestions.sort((a, b) => b.count - a.count);
  }

  return res.json({ rules, categories, suggestions: suggestions.slice(0, 5) });
});

router.post("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { categoryId, merchantContains, descriptionContains, priority, excludeFromBudget } = req.body as {
    categoryId: string;
    merchantContains?: string;
    descriptionContains?: string;
    priority?: number;
    excludeFromBudget?: boolean;
  };

  const [rule] = await db
    .insert(categoryRulesTable)
    .values({
      id: cuid(),
      householdId: user.householdId,
      categoryId,
      merchantContains: merchantContains || null,
      descriptionContains: descriptionContains || null,
      priority: priority ?? 100,
      excludeFromBudget: excludeFromBudget ?? false,
    })
    .returning();

  const category = await db.select().from(categoriesTable).where(eq(categoriesTable.id, rule.categoryId)).limit(1);

  return res.status(201).json({ ...rule, categoryName: category[0]?.name ?? "" });
});

router.patch("/:id", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.params;
  const { categoryId, merchantContains, descriptionContains, priority, excludeFromBudget, isActive } = req.body as {
    categoryId?: string;
    merchantContains?: string | null;
    descriptionContains?: string | null;
    priority?: number;
    excludeFromBudget?: boolean;
    isActive?: boolean;
  };

  const updateData: Record<string, unknown> = {};
  if (categoryId !== undefined) updateData.categoryId = categoryId;
  if (merchantContains !== undefined) updateData.merchantContains = merchantContains;
  if (descriptionContains !== undefined) updateData.descriptionContains = descriptionContains;
  if (priority !== undefined) updateData.priority = priority;
  if (excludeFromBudget !== undefined) updateData.excludeFromBudget = excludeFromBudget;
  if (isActive !== undefined) updateData.isActive = isActive;

  const [updated] = await db
    .update(categoryRulesTable)
    .set(updateData)
    .where(and(eq(categoryRulesTable.id, id), eq(categoryRulesTable.householdId, user.householdId)))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });

  const category = await db.select().from(categoriesTable).where(eq(categoriesTable.id, updated.categoryId)).limit(1);

  return res.json({ ...updated, categoryName: category[0]?.name ?? "" });
});

router.delete("/:id", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.params;
  await db.delete(categoryRulesTable).where(and(eq(categoryRulesTable.id, id), eq(categoryRulesTable.householdId, user.householdId)));

  return res.status(204).send();
});

router.post("/apply", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rules = await db
    .select()
    .from(categoryRulesTable)
    .where(and(eq(categoryRulesTable.householdId, user.householdId), eq(categoryRulesTable.isActive, true)))
    .orderBy(categoryRulesTable.priority);

  const connections = await db.select({ id: connectionsTable.id }).from(connectionsTable).where(eq(connectionsTable.householdId, user.householdId));

  let applied = 0;
  for (const conn of connections) {
    const accts = await db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.connectionId, conn.id));
    for (const acct of accts) {
      const txs = await db.select().from(transactionsTable).where(and(eq(transactionsTable.accountId, acct.id), isNull(transactionsTable.categoryId)));
      for (const tx of txs) {
        const matched = rules.find((r) => ruleMatches(r, tx));
        if (matched) {
          await db.update(transactionsTable).set({ categoryId: matched.categoryId, excludedFromBudget: matched.excludeFromBudget }).where(eq(transactionsTable.id, tx.id));
          applied++;
        }
      }
    }
  }

  return res.json({ applied });
});

export default router;
