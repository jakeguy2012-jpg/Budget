import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useMe, useLogout } from "@/lib/auth";
import { ShieldCheck, Download, LogOut, User } from "lucide-react";

function ExportButton({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      <Download className="h-4 w-4" />
      {label}
    </a>
  );
}

export default function SettingsPage() {
  const { data: user } = useMe();
  const logout = useLogout();

  return (
    <RequireAuth>
      <AppShell>
        <h2 className="text-3xl font-bold">Settings</h2>

        {/* Account info */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-slate-400" />
            <h3 className="font-semibold">Account</h3>
          </div>
          {user && (
            <div className="space-y-1 text-sm">
              <p><span className="text-slate-500">Name:</span> {user.name}</p>
              <p><span className="text-slate-500">Username:</span> {user.username}</p>
              <p><span className="text-slate-500">Role:</span> {user.role}</p>
              <p><span className="text-slate-500">Household:</span> {user.householdName}</p>
            </div>
          )}
          <button
            onClick={() => logout.mutate()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </section>

        {/* Exports */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-4">
          <h3 className="font-semibold mb-1">Export data</h3>
          <p className="text-sm text-slate-500 mb-4">
            Download your financial data at any time. Exports are generated fresh on each request.
          </p>
          <div className="flex flex-wrap gap-3">
            <ExportButton label="Transactions CSV" href="/api/export" />
            <ExportButton label="Budgets CSV" href="/api/export?type=budgets" />
            <ExportButton label="Household JSON" href="/api/export?type=json" />
          </div>
        </section>

        {/* Security info */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-4">
          <div className="flex items-center gap-2 font-semibold mb-3">
            <ShieldCheck className="h-5 w-5 text-green-600" /> Security
          </div>
          <ul className="text-sm text-slate-600 space-y-2">
            <li className="flex gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              Sessions use HttpOnly cookies — inaccessible to JavaScript
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              Bank credentials are encrypted at rest with AES-256-GCM
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              Passwords are hashed with bcrypt (12 rounds)
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              All API routes are household-scoped — no cross-household data access
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              Login rate-limited to 8 attempts per IP per 15 minutes
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              This app has zero capability to initiate payments, transfers, or account changes
            </li>
          </ul>
        </section>

        {/* Demo notice */}
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mt-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Demo environment</p>
          <p>
            This instance uses demo credentials (<strong>jake</strong> and <strong>wife</strong>, password: <strong>demo1234</strong>).
            Before using with real financial data, change passwords via the seed script and update
            the <code>SESSION_SECRET</code> and <code>APP_ENCRYPTION_KEY</code> Replit Secrets.
          </p>
        </section>
      </AppShell>
    </RequireAuth>
  );
}
