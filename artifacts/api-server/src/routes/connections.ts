import { Router } from "express";
import { db, connectionsTable, syncRunsTable, accountsTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "../lib/auth";
import { encryptSecret } from "../lib/crypto";
import { cuid } from "../lib/cuid";
import { logger } from "../lib/logger";

const router = Router();

// ── GET /api/connections ───────────────────────────────────────────────────
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

// ── POST /api/connections ──────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "admin") return res.status(403).json({ error: "Admins only" });

  const { provider, name, credential } = req.body as {
    provider: string; name: string; credential?: string;
  };
  if (!name?.trim()) return res.status(400).json({ error: "Connection name is required" });

  const isMock = provider === "demo";

  if (!isMock) {
    if (provider !== "simplefin")
      return res.status(400).json({ error: "Only SimpleFIN and demo providers are supported" });
    if (!credential || credential.trim().length < 10)
      return res.status(400).json({ error: "A valid SimpleFIN access URL is required" });
  }

  let encrypted: string | null = null;
  if (!isMock) {
    try {
      encrypted = encryptSecret(credential!.trim());
    } catch {
      return res.status(500).json({ error: "Failed to encrypt credentials. Check APP_ENCRYPTION_KEY." });
    }
  }

  const [conn] = await db
    .insert(connectionsTable)
    .values({
      id: cuid(),
      householdId: user.householdId,
      provider: isMock ? "demo" : "simplefin",
      name: name.trim(),
      encryptedCredentials: encrypted,
    })
    .returning({
      id: connectionsTable.id,
      name: connectionsTable.name,
      provider: connectionsTable.provider,
      isActive: connectionsTable.isActive,
    });

  logger.info(
    { connectionId: conn.id, provider: conn.provider },
    "New connection saved",
  );

  return res.status(201).json({
    id: conn.id,
    name: conn.name,
    provider: conn.provider,
    isActive: conn.isActive,
    lastSyncedAt: null,
    syncRuns: [],
  });
});

// ── POST /api/connections/:id/sync ─────────────────────────────────────────
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

  // Run sync in background — result is visible in sync history
  import("../lib/sync").then(({ syncConnection }) => {
    syncConnection(id, startDate, new Date()).catch((err) => {
      logger.error(
        { connectionId: id, err: err instanceof Error ? err.message : "unknown" },
        "Background sync failed",
      );
    });
  });

  return res.json({ message: "Sync started", connectionId: id });
});

// ── DELETE /api/connections/:id ────────────────────────────────────────────
// Permanently removes the connection, all its accounts, and all their transactions.
// This is irreversible. Export your data first.
router.delete("/:id", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "admin") return res.status(403).json({ error: "Admins only" });

  const { id } = req.params;
  const [conn] = await db
    .select({ id: connectionsTable.id, householdId: connectionsTable.householdId, name: connectionsTable.name })
    .from(connectionsTable)
    .where(eq(connectionsTable.id, id))
    .limit(1);

  if (!conn || conn.householdId !== user.householdId) {
    return res.status(404).json({ error: "Connection not found" });
  }

  // Delete child records in order: transactions → accounts → sync runs → connection
  const accts = await db
    .select({ id: accountsTable.id })
    .from(accountsTable)
    .where(eq(accountsTable.connectionId, id));

  for (const acct of accts) {
    await db.delete(transactionsTable).where(eq(transactionsTable.accountId, acct.id));
  }
  await db.delete(accountsTable).where(eq(accountsTable.connectionId, id));
  await db.delete(syncRunsTable).where(eq(syncRunsTable.connectionId, id));
  await db.delete(connectionsTable).where(eq(connectionsTable.id, id));

  logger.info({ connectionId: id, name: conn.name }, "Connection deleted by admin");

  return res.json({ ok: true, deleted: conn.name });
});

export default router;
