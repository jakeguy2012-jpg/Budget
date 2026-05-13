import { AppShell } from '@/components/AppShell';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { startOfMonth } from 'date-fns';

export default async function BudgetsPage() { const user = await getCurrentUser(); if (!user) redirect('/login'); const month = startOfMonth(new Date()); const budgets = await prisma.budget.findMany({ where: { householdId: user.householdId, month }, include: { category: true }, orderBy: { category: { name: 'asc' } } }); return <AppShell><h2 className="text-3xl font-bold">Budgets</h2><p className="text-slate-500">Set simple monthly planned spending by category. Copying previous month can be added from this table.</p><div className="card mt-6"><table className="w-full text-sm"><tbody>{budgets.map(b=><tr className="border-t" key={b.id}><td className="py-3">{b.category.name}</td><td>${Number(b.planned).toFixed(2)}</td></tr>)}</tbody></table></div></AppShell>; }
