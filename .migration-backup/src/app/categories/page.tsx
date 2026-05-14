import { AppShell } from '@/components/AppShell';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
export default async function CategoriesPage(){ const user=await getCurrentUser(); if(!user) redirect('/login'); const categories=await prisma.category.findMany({where:{householdId:user.householdId},orderBy:{name:'asc'}}); return <AppShell><h2 className="text-3xl font-bold">Categories</h2><div className="mt-6 grid gap-3 md:grid-cols-3">{categories.map(c=><div className="card flex items-center gap-3" key={c.id}><span className="h-4 w-4 rounded-full" style={{background:c.color}} />{c.name}</div>)}</div></AppShell> }
