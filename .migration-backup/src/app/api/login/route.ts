import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkLoginRateLimit, createSessionToken, sessionCookie, verifyPassword } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const username = String(form.get('username') ?? '').toLowerCase();
  const password = String(form.get('password') ?? '');
  const ip = request.headers.get('x-forwarded-for') ?? 'local';
  if (!checkLoginRateLimit(`${ip}:${username}`)) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return NextResponse.redirect(new URL('/login?error=1', request.url), 303);
  await audit(user.householdId, 'login', { userId: user.id });
  const response = NextResponse.redirect(new URL('/dashboard', request.url), 303);
  response.headers.set('Set-Cookie', sessionCookie(createSessionToken(user.id)));
  return response;
}
