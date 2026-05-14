import { Router } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "../lib/auth";
import { cuid } from "../lib/cuid";

const router = Router();

router.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const categories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.householdId, user.householdId))
    .orderBy(categoriesTable.name);

  return res.json(categories);
});

router.post("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { name, color, icon } = req.body as { name: string; color?: string; icon?: string };
  if (!name) return res.status(400).json({ error: "Name is required" });

  const [created] = await db
    .insert(categoriesTable)
    .values({ id: cuid(), householdId: user.householdId, name, color: color ?? "#2563eb", icon: icon ?? "circle" })
    .returning();

  return res.status(201).json(created);
});

export default router;
