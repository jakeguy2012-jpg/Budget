import { Router } from "express";
import { db, budgetsTable, categoriesTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { getCurrentUser } from "../lib/auth";
import { cuid } from "../lib/cuid";
import { startOfMonth } from "date-fns";

const router = Router();

router.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const monthStart = startOfMonth(new Date());

  const budgets = await db
    .select({
      id: budgetsTable.id,
      categoryId: budgetsTable.categoryId,
      month: budgetsTable.month,
      planned: budgetsTable.planned,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
    })
    .from(budgetsTable)
    .innerJoin(categoriesTable, eq(budgetsTable.categoryId, categoriesTable.id))
    .where(and(eq(budgetsTable.householdId, user.householdId), gte(budgetsTable.month, monthStart)))
    .orderBy(categoriesTable.name);

  return res.json(budgets.map((b) => ({
    id: b.id,
    categoryId: b.categoryId,
    categoryName: b.categoryName,
    categoryColor: b.categoryColor,
    month: b.month.toISOString(),
    planned: b.planned,
  })));
});

router.post("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { categoryId, planned, month } = req.body as { categoryId: string; planned: number; month?: string };
  const monthDate = month ? new Date(month) : startOfMonth(new Date());

  const existing = await db
    .select()
    .from(budgetsTable)
    .where(and(
      eq(budgetsTable.householdId, user.householdId),
      eq(budgetsTable.categoryId, categoryId),
      gte(budgetsTable.month, monthDate),
    ))
    .limit(1);

  let budget;
  if (existing[0]) {
    [budget] = await db.update(budgetsTable).set({ planned: String(planned) }).where(eq(budgetsTable.id, existing[0].id)).returning();
  } else {
    [budget] = await db.insert(budgetsTable).values({ id: cuid(), householdId: user.householdId, categoryId, month: monthDate, planned: String(planned) }).returning();
  }

  const category = await db.select().from(categoriesTable).where(eq(categoriesTable.id, categoryId)).limit(1);

  return res.json({
    id: budget.id,
    categoryId: budget.categoryId,
    categoryName: category[0]?.name ?? "",
    categoryColor: category[0]?.color ?? "#2563eb",
    month: budget.month.toISOString(),
    planned: budget.planned,
  });
});

export default router;
