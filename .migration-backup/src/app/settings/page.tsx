import { AppShell } from '@/components/AppShell';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
export default async function SettingsPage(){ const user=await getCurrentUser(); if(!user) redirect('/login'); return <AppShell><h2 className="text-3xl font-bold">Settings</h2><div className="card mt-6 space-y-4"><p>Signed in as {user.name} ({user.role}).</p><div className="flex flex-wrap gap-3"><a className="btn" href="/api/export?type=transactions">Export transactions CSV</a><a className="btn" href="/api/export?type=budgets">Export budgets CSV</a><a className="btn" href="/api/export?type=json">Export household JSON</a><form action="/api/logout" method="post"><button className="btn bg-slate-700">Sign out</button></form></div></div></AppShell> }
