import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(); if (!user) return NextResponse.redirect(new URL('/login', request.url), 303);
  const form = await request.formData();
  const action = String(form.get('action') ?? 'create');
  const id = String(form.get('id') ?? '');
  if (action === 'delete' && id) await prisma.categoryRule.delete({ where: { id } });
  else if (action === 'update' && id) await prisma.categoryRule.update({ where: { id }, data: { merchantContains: String(form.get('merchantContains') || '') || null, descriptionContains: String(form.get('descriptionContains') || '') || null, categoryId: String(form.get('categoryId')), priority: Number(form.get('priority') || 100), excludeFromBudget: form.get('excludeFromBudget') === 'on' } });
  else await prisma.categoryRule.create({ data: { householdId: user.householdId, categoryId: String(form.get('categoryId')), merchantContains: String(form.get('merchantContains') || '') || null, descriptionContains: String(form.get('descriptionContains') || '') || null, priority: Number(form.get('priority') || 100), excludeFromBudget: form.get('excludeFromBudget') === 'on' } });
  return NextResponse.redirect(new URL('/rules', request.url), 303);
}
