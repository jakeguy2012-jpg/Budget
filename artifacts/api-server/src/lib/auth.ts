import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable, householdsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request } from "express";

const COOKIE = "ffh_session";
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function checkLoginRateLimit(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= 8;
}

export function createSessionToken(userId: string) {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET is required");
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}

export async function getCurrentUser(req: Request) {
  const raw = req.headers.cookie ?? "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  const token = match?.[1];
  if (!token || !process.env["SESSION_SECRET"]) return null;
  try {
    const decoded = jwt.verify(token, process.env["SESSION_SECRET"]) as { userId: string };
    const user = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        username: usersTable.username,
        role: usersTable.role,
        householdId: usersTable.householdId,
        householdName: householdsTable.name,
      })
      .from(usersTable)
      .innerJoin(householdsTable, eq(usersTable.householdId, householdsTable.id))
      .where(eq(usersTable.id, decoded.userId))
      .limit(1);
    return user[0] ?? null;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string) {
  return `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}
