import { Router } from "express";
import { db, accountsTable, connectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const connections = await db.select({ id: connectionsTable.id, provider: connectionsTable.provider, name: connectionsTable.name }).from(connectionsTable).where(eq(connectionsTable.householdId, user.householdId));

  const result = [];
  for (const conn of connections) {
    const accounts = await db.select().from(accountsTable).where(eq(accountsTable.connectionId, conn.id)).orderBy(accountsTable.name);
    for (const a of accounts) {
      result.push({
        id: a.id,
        name: a.name,
        type: a.type,
        subtype: a.subtype,
        mask: a.mask,
        currentBalance: a.currentBalance,
        currency: a.currency,
        isActive: a.isActive,
        provider: conn.provider,
        connectionName: conn.name,
      });
    }
  }

  return res.json(result);
});

export default router;
