import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const checks: Record<string, "ok" | "error"> = {
    api: "ok",
    db: "error",
    session_secret: process.env["SESSION_SECRET"] ? "ok" : "error",
    encryption_key: process.env["APP_ENCRYPTION_KEY"] ? "ok" : "error",
  };

  try {
    await db.execute(sql`SELECT 1`);
    checks.db = "ok";
  } catch {
    // DB not reachable — don't expose details
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  const syncProvider = process.env["BANK_SYNC_PROVIDER"] ?? "simplefin";

  return res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    checks,
    syncProvider,
    demoMode: syncProvider === "mock",
  });
});

export default router;
