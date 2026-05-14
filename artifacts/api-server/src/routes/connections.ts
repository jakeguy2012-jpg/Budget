import { Router } from "express";
import { db, connectionsTable, syncRunsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "../lib/auth";
import { encryptSecret } from "../lib/crypto";
import { cuid } from "../lib/cuid";

const router = Router();

router.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const connections = await db
    .select()
    .from(connectionsTable)
    .where(eq(connectionsTable.householdId, user.householdId));

  const result = [];
  for (const conn of connections) {
    const syncRuns = await db
      .select()
      .from(syncRunsTable)
      .where(eq(syncRunsTable.connectionId, conn.id))
      .orderBy(desc(syncRunsTable.startedAt))
      .limit(3);

    result.push({
      id: conn.id,
      name: conn.name,
      provider: conn.provider,
      isActive: conn.isActive,
      lastSyncedAt: conn.lastSyncedAt?.toISOString() ?? null,
      syncRuns: syncRuns.map((r) => ({
        id: r.id,
        startedAt: r.startedAt.toISOString(),
        status: r.status,
        transactionsInserted: Number(r.transactionsInserted),
        errorMessage: r.errorMessage,
      })),
    });
  }

  return res.json(result);
});

router.post("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "admin") return res.status(403).json({ error: "Admins only" });

  const { provider, name, credential } = req.body as { provider: string; name: string; credential: string };
  if (provider !== "simplefin") return res.status(400).json({ error: "Only SimpleFIN supported in MVP" });

  const [conn] = await db
    .insert(connectionsTable)
    .values({
      id: cuid(),
      householdId: user.householdId,
      provider: "simplefin",
      name,
      encryptedCredentials: encryptSecret(credential),
    })
    .returning();

  return res.status(201).json({
    id: conn.id,
    name: conn.name,
    provider: conn.provider,
    isActive: conn.isActive,
    lastSyncedAt: null,
    syncRuns: [],
  });
});

router.post("/:id/sync", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.params;
  const conn = await db.select().from(connectionsTable).where(eq(connectionsTable.id, id)).limit(1);
  if (!conn[0] || conn[0].householdId !== user.householdId) {
    return res.status(404).json({ error: "Not found" });
  }

  // Fire sync in background (don't block)
  const syncDays = Number(process.env["SIMPLEFIN_SYNC_DAYS"] ?? 90);
  const startDate = new Date(Date.now() - syncDays * 24 * 60 * 60 * 1000);

  // Import lazily to avoid blocking
  import("../lib/sync").then(({ syncConnection }) => {
    syncConnection(id, startDate, new Date()).catch((err) => {
      console.error("Sync failed:", err);
    });
  });

  return res.json({ message: "Sync started" });
});

export default router;
