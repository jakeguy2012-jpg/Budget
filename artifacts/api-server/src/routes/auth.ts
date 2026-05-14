import { Router } from "express";
import { db, usersTable, householdsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getCurrentUser, checkLoginRateLimit, verifyPassword, createSessionToken, sessionCookie, clearSessionCookie } from "../lib/auth";

const router = Router();

router.get("/me", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  return res.json(user);
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body as { username: string; password: string };
  const ip = (req.headers["x-forwarded-for"] as string) ?? "local";
  if (!checkLoginRateLimit(`${ip}:${username}`)) {
    return res.status(429).json({ error: "Too many attempts" });
  }
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username.toLowerCase()))
    .limit(1);
  if (!user[0] || !(await verifyPassword(password, user[0].passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const household = await db
    .select()
    .from(householdsTable)
    .where(eq(householdsTable.id, user[0].householdId))
    .limit(1);
  const token = createSessionToken(user[0].id);
  res.setHeader("Set-Cookie", sessionCookie(token));
  return res.json({
    id: user[0].id,
    name: user[0].name,
    username: user[0].username,
    role: user[0].role,
    householdId: user[0].householdId,
    householdName: household[0]?.name ?? "",
  });
});

router.post("/logout", (_req, res) => {
  res.setHeader("Set-Cookie", clearSessionCookie());
  return res.json({ ok: true });
});

export default router;
