import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './db';

const COOKIE = 'ffh_session';
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
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is required');
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
}

export async function getCurrentUser() {
  const token = cookies().get(COOKIE)?.value;
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET) as { userId: string };
    return prisma.user.findUnique({ where: { id: decoded.userId }, include: { household: true } });
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
