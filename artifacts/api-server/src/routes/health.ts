import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const checks: Record<string, "ok" | "error"> = { api: "ok", db: "error" };

  try {
    await db.execute(sql`SELECT 1`);
    checks.db = "ok";
  } catch {
    // DB not reachable — don't expose details
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  const data = HealthCheckResponse.parse({ status: allOk ? "ok" : "degraded" });
  res.status(allOk ? 200 : 503).json({ ...data, checks });
});

export default router;
