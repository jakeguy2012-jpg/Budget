import { Router } from "express";
import { db, connectionsTable, syncRunsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "../lib/auth";
import { encryptSecret } from "../lib/crypto";
import { cuid } from "../lib/cuid";
import { logger } from "../lib/logger";

const router = Router();

router.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const connections = await db
    .select({
      id: connectionsTable.id,
      name: connectionsTable.name,
      provider: connectionsTable.provider,
      isActive: connectionsTable.isActive,
      lastSyncedAt: connectionsTable.lastSyncedAt,
    })
    .from(connectionsTable)
    .where(eq(connectionsTable.householdId, user.householdId));

  const result = [];
  for (const conn of connections) {
    const syncRuns = await db
      .select()
      .from(syncRunsTable)
      .where(eq(syncRunsTable.connectionId, conn.id))
      .orderBy(desc(syncRunsTable.startedAt))
      .limit(5);

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
        transactionsInserted: Number(r.transactionsInserted ?? 0),
        transactionsUpdated: Number(r.transactionsUpdated ?? 0),
        accountsSynced: Number(r.accountsSynced ?? 0),
        errorMessage: r.errorMessage ?? null,
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
  if (!credential || credential.trim().length < 10) {
    return res.status(400).json({ error: "A valid SimpleFIN access URL is required" });
  }
  if (provider !== "simplefin") return res.status(400).json({ error: "Only SimpleFIN is supported" });
  if (!name?.trim()) return res.status(400).json({ error: "Connection name is required" });

  let encrypted: string;
  try {
    encrypted = encryptSecret(credential.trim());
  } catch {
    return res.status(500).json({ error: "Failed to encrypt credentials. Check APP_ENCRYPTION_KEY." });
  }

  const [conn] = await db
    .insert(connectionsTable)
    .values({
      id: cuid(),
      householdId: user.householdId,
      provider: "simplefin",
      name: name.trim(),
      encryptedCredentials: encrypted,
    })
    .returning({ id: connectionsTable.id, name: connectionsTable.name, provider: connectionsTable.provider, isActive: connectionsTable.isActive });

  logger.info({ connectionId: conn.id, provider: "simplefin" }, "New connection saved");

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
  const conn = await db
    .select({ id: connectionsTable.id, householdId: connectionsTable.householdId })
    .from(connectionsTable)
    .where(eq(connectionsTable.id, id))
    .limit(1);

  if (!conn[0] || conn[0].householdId !== user.householdId) {
    return res.status(404).json({ error: "Connection not found" });
  }

  const syncDays = Number(process.env["SIMPLEFIN_SYNC_DAYS"] ?? 90);
  const startDate = new Date(Date.now() - syncDays * 24 * 60 * 60 * 1000);

  import("../lib/sync").then(({ syncConnection }) => {
    syncConnection(id, startDate, new Date()).catch((err) => {
      logger.error({ connectionId: id, err: err instanceof Error ? err.message : "unknown" }, "Background sync failed");
    });
  });

  return res.json({ message: "Sync started", connectionId: id });
});

export default router;
