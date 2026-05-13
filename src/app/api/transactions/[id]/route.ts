import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser(); if (!user) return NextResponse.redirect(new URL('/login', request.url), 303);
  const form = await request.formData();
  const categoryId = String(form.get('categoryId') ?? '') || null;
  await prisma.transaction.update({ where: { id: params.id }, data: { categoryId, userReviewed: true } });
  await audit(user.householdId, 'category_changed', { userId: user.id, entityType: 'Transaction', entityId: params.id });
  return NextResponse.redirect(new URL('/transactions', request.url), 303);
}
