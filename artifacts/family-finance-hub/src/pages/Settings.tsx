import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useMe, useLogout } from "@/lib/auth";

export default function SettingsPage() {
  const { data: user } = useMe();
  const logout = useLogout();

  return (
    <RequireAuth>
      <AppShell>
        <h2 className="text-3xl font-bold">Settings</h2>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6 space-y-4">
          {user && <p>Signed in as <strong>{user.name}</strong> ({user.role}).</p>}
          <div className="flex flex-wrap gap-3">
            <a
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              href="/api/export?type=transactions"
            >
              Export transactions CSV
            </a>
            <a
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              href="/api/export?type=budgets"
            >
              Export budgets CSV
            </a>
            <a
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              href="/api/export?type=json"
            >
              Export household JSON
            </a>
            <button
              onClick={() => logout.mutate()}
              className="inline-flex items-center justify-center rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
