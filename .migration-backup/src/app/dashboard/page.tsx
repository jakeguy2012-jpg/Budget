import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { CategoryPie, SimpleBar } from '@/components/Charts';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { startOfMonth, subMonths } from 'date-fns';

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default async function DashboardPage() {
  const user = await getCurrentUser(); if (!user) redirect('/login');
  const monthStart = startOfMonth(new Date()); const priorStart = startOfMonth(subMonths(new Date(), 1));
  const transactions = await prisma.transaction.findMany({ where: { account: { connection: { householdId: user.householdId } }, date: { gte: priorStart }, excludedFromBudget: false }, include: { category: true, account: true } });
  const current = transactions.filter((t) => t.date >= monthStart);
  const spending = current.filter((t) => t.direction === 'expense').reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const income = current.filter((t) => t.direction === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const byCategory = Object.values(current.filter((t) => t.direction === 'expense').reduce<Record<string, { name: string; value: number; color: string }>>((acc, t) => { const name = t.category?.name ?? 'Uncategorized'; acc[name] ??= { name, value: 0, color: t.category?.color ?? '#64748b' }; acc[name].value += Math.abs(Number(t.amount)); return acc; }, {}));
  const byAccount = Object.values(current.reduce<Record<string, { name: string; value: number }>>((acc, t) => { acc[t.account.name] ??= { name: t.account.name, value: 0 }; acc[t.account.name].value += Math.abs(Number(t.amount)); return acc; }, {}));
  const uncategorized = current.filter((t) => !t.categoryId).length;
  const budgets = await prisma.budget.findMany({ where: { householdId: user.householdId, month: monthStart }, include: { category: true } });
  return <AppShell><div className="mb-6"><p className="text-sm text-slate-500">This month</p><h2 className="text-3xl font-bold">Household snapshot</h2></div>
    <div className="grid gap-4 md:grid-cols-4"><StatCard label="Spending" value={money(spending)} /><StatCard label="Income" value={money(income)} /><StatCard label="Net cash flow" value={money(income - spending)} /><StatCard label="Needs review" value={String(uncategorized)} hint="uncategorized transactions" /></div>
    <div className="mt-6 grid gap-4 lg:grid-cols-2"><section className="card"><h3 className="font-semibold">Spending by category</h3><CategoryPie data={byCategory} /></section><section className="card"><h3 className="font-semibold">Spending by account</h3><SimpleBar data={byAccount} /></section></div>
    <section className="card mt-6"><h3 className="mb-4 font-semibold">Budget left</h3><div className="space-y-3">{budgets.map((budget) => { const actual = byCategory.find((c) => c.name === budget.category.name)?.value ?? 0; const planned = Number(budget.planned); return <div key={budget.id}><div className="flex justify-between text-sm"><span>{budget.category.name}</span><span>{money(planned - actual)} left</span></div><div className="mt-1 h-3 rounded-full bg-slate-100"><div className={`h-3 rounded-full ${actual > planned ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${planned ? Math.min((actual / planned) * 100, 100) : 0}%` }} /></div></div>; })}</div></section>
  </AppShell>;
}
