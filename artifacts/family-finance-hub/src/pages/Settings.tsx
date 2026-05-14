import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useMe, useLogout } from "@/lib/auth";
import { useHealthChecks } from "@/components/DemoBanner";
import { ShieldCheck, Download, LogOut, User, Database, FlaskConical, AlertTriangle } from "lucide-react";

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

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${ok ? "bg-green-500" : "bg-red-500"}`}
    />
  );
}

export default function SettingsPage() {
  const { data: user } = useMe();
  const logout = useLogout();
  const { data: health } = useHealthChecks();

  const checks = health?.checks ?? {};
  const syncProvider = health?.syncProvider ?? "…";
  const demoMode = health?.demoMode ?? false;

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
              <p><span className="text-slate-500 w-28 inline-block">Name</span>{user.name}</p>
              <p><span className="text-slate-500 w-28 inline-block">Username</span>{user.username}</p>
              <p><span className="text-slate-500 w-28 inline-block">Role</span>{user.role}</p>
              <p><span className="text-slate-500 w-28 inline-block">Household</span>{user.householdName}</p>
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

        {/* System status */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-4">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-5 w-5 text-slate-400" />
            <h3 className="font-semibold">System status</h3>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { key: "api",            label: "API server" },
              { key: "db",             label: "Database (PostgreSQL)" },
              { key: "session_secret", label: "SESSION_SECRET" },
              { key: "encryption_key", label: "APP_ENCRYPTION_KEY" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <StatusDot ok={checks[key] === "ok"} />
                <span className="text-slate-700 flex-1">{label}</span>
                <span className={`text-xs font-medium ${checks[key] === "ok" ? "text-green-700" : "text-red-600"}`}>
                  {checks[key] === "ok" ? "ok" : "missing / error"}
                </span>
              </div>
            ))}
          </div>

          {/* Sync provider */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-3 text-sm">
              <FlaskConical className="h-4 w-4 text-slate-400" />
              <span className="flex-1 text-slate-700">Bank sync provider</span>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${demoMode ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                {demoMode ? "DEMO / mock" : syncProvider}
              </span>
            </div>
            {demoMode && (
              <p className="mt-2 text-xs text-amber-700 ml-7">
                Running in demo mode. Set <code className="rounded bg-amber-50 border border-amber-200 px-1">BANK_SYNC_PROVIDER=simplefin</code> in Replit Secrets to enable real bank sync.
              </p>
            )}
          </div>
        </section>

        {/* Exports */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-4">
          <h3 className="font-semibold mb-1">Export data</h3>
          <p className="text-sm text-slate-500 mb-4">
            Download your financial data at any time. Credentials and secrets are{" "}
            <strong>never included</strong> in exports.
          </p>
          <div className="flex flex-wrap gap-3">
            <ExportButton label="Transactions CSV" href="/api/export" />
            <ExportButton label="Budgets CSV"      href="/api/export?type=budgets" />
            <ExportButton label="Household JSON"   href="/api/export?type=json" />
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Tip: export your transactions CSV before connecting real accounts, and again after each sync, so you always have a local backup.
          </p>
        </section>

        {/* Security */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-4">
          <div className="flex items-center gap-2 font-semibold mb-3">
            <ShieldCheck className="h-5 w-5 text-green-600" /> Security posture
          </div>
          <ul className="text-sm text-slate-600 space-y-2">
            {[
              "Sessions use HttpOnly cookies — inaccessible to JavaScript",
              "Bank credentials encrypted at rest with AES-256-GCM",
              "Passwords hashed with bcrypt (12 rounds)",
              "All API routes are household-scoped (no cross-household access)",
              "Login rate-limited to 8 attempts per IP per 15 minutes",
              "encryptedCredentials never included in exports or API responses",
              "No money movement features: no payments, transfers, ACH, card actions",
              "SimpleFIN sync is read-only — balance and transaction data only",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Backup instructions */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-4">
          <h3 className="font-semibold mb-2">Backup & recovery</h3>
          <div className="text-sm text-slate-600 space-y-2">
            <p><strong>Primary backup:</strong> Export transactions CSV regularly (above).</p>
            <p><strong>Full backup:</strong> Export household JSON (above) — includes categories, connections (no credentials).</p>
            <p><strong>Replit-specific:</strong> Replit creates automatic checkpoints. You can roll back to any checkpoint from the Version History panel.</p>
            <p><strong>Database:</strong> PostgreSQL data is managed by Replit and persists across restarts. It is NOT stored in local files.</p>
            <p><strong>Restore:</strong> Re-import a transactions CSV via the Imports page. Re-add SimpleFIN connections via the Connections page.</p>
          </div>
        </section>

        {/* Demo notice */}
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mt-4 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <AlertTriangle className="h-4 w-4" /> Demo environment
          </div>
          <p>
            This instance uses demo credentials (<strong>jake</strong> and <strong>wife</strong>,
            password: <strong>demo1234</strong>). Before using with real financial data, change
            passwords via the seed script and rotate <code className="bg-amber-100 rounded px-1">SESSION_SECRET</code>{" "}
            and <code className="bg-amber-100 rounded px-1">APP_ENCRYPTION_KEY</code> in Replit Secrets.
          </p>
        </section>
      </AppShell>
    </RequireAuth>
  );
}
