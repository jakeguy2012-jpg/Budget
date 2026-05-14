import Link from 'next/link';
import { ReactNode } from 'react';

const links = [
  ['Home','/dashboard'],['Review','/transactions'],['Budgets','/budgets'],['Categories','/categories'],['Rules','/rules'],['Accounts','/accounts'],['Connections','/connections'],['Imports','/imports'],['Settings','/settings']
];

export function AppShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen md:flex">
    <aside className="hidden w-64 border-r bg-white p-4 md:block">
      <h1 className="mb-6 text-xl font-bold">Family Finance Hub</h1>
      <nav className="grid gap-1">{links.map(([label, href]) => <Link className="nav-link" href={href} key={href}>{label}</Link>)}</nav>
    </aside>
    <main className="flex-1 p-4 pb-24 md:p-8">{children}</main>
    <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t bg-white p-2 md:hidden">
      {links.slice(0,5).map(([label, href]) => <Link className="text-center text-xs font-medium text-slate-700" href={href} key={href}>{label}</Link>)}
    </nav>
  </div>;
}
