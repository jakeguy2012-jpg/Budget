import { AppShell } from '@/components/AppShell';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
export default async function AccountsPage(){ const user=await getCurrentUser(); if(!user) redirect('/login'); const accounts=await prisma.account.findMany({where:{connection:{householdId:user.householdId}},include:{connection:true},orderBy:{name:'asc'}}); return <AppShell><h2 className="text-3xl font-bold">Accounts</h2><div className="card mt-6"><table className="w-full text-sm"><thead><tr className="text-left"><th>Name</th><th>Type</th><th>Mask</th><th>Balance</th><th>Provider</th></tr></thead><tbody>{accounts.map(a=><tr className="border-t" key={a.id}><td className="py-3">{a.name}</td><td>{a.type}</td><td>{a.mask ? `•••• ${a.mask}` : '—'}</td><td>${Number(a.currentBalance).toFixed(2)}</td><td>{a.connection.provider}</td></tr>)}</tbody></table></div></AppShell> }
