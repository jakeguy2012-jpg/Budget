import { AppShell } from '@/components/AppShell';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default async function TransactionsPage({ searchParams }: { searchParams: { q?: string; uncategorized?: string; category?: string; account?: string } }) {
  const user = await getCurrentUser(); if (!user) redirect('/login');
  const categories = await prisma.category.findMany({ where: { householdId: user.householdId }, orderBy: { name: 'asc' } });
  const accounts = await prisma.account.findMany({ where: { connection: { householdId: user.householdId } }, orderBy: { name: 'asc' } });
  const txs = await prisma.transaction.findMany({ where: { account: { connection: { householdId: user.householdId } }, ...(searchParams.q ? { OR: [{ description: { contains: searchParams.q, mode: 'insensitive' } }, { merchantName: { contains: searchParams.q, mode: 'insensitive' } }] } : {}), ...(searchParams.uncategorized ? { categoryId: null } : {}), ...(searchParams.category ? { categoryId: searchParams.category } : {}), ...(searchParams.account ? { accountId: searchParams.account } : {}) }, include: { account: true, category: true }, orderBy: { date: 'desc' }, take: 200 });
  return <AppShell><h2 className="text-3xl font-bold">Review transactions</h2><p className="mt-1 text-slate-500">Search, categorize, mark reviewed, or exclude items from the budget.</p>
    <form className="card mt-6 grid gap-3 md:grid-cols-5"><input className="input" name="q" placeholder="Search" defaultValue={searchParams.q} /><select className="input" name="account"><option value="">All accounts</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><select className="input" name="category"><option value="">All categories</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><label className="flex items-center gap-2 text-sm"><input name="uncategorized" value="1" type="checkbox" /> Needs review</label><button className="btn">Filter</button></form>
    <div className="card mt-6 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th>Date</th><th>Account</th><th>Merchant / Description</th><th>Amount</th><th>Category</th><th>Reviewed</th><th>Notes</th></tr></thead><tbody>{txs.map(tx=><tr className="border-t" key={tx.id}><td className="py-3">{tx.date.toISOString().slice(0,10)}</td><td>{tx.account.name}</td><td>{tx.merchantName ?? tx.description}</td><td className={Number(tx.amount) < 0 ? 'text-red-600' : 'text-green-700'}>{money(Number(tx.amount))}</td><td><form action={`/api/transactions/${tx.id}`} method="post"><select className="input" name="categoryId" defaultValue={tx.categoryId ?? ''}><option value="">Uncategorized</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="mt-1 text-xs text-brand-600">Save</button></form></td><td>{tx.userReviewed ? 'Yes' : 'No'}</td><td>{tx.notes}</td></tr>)}</tbody></table></div>
  </AppShell>;
}
