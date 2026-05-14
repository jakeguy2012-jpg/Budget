import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { apiGet } from "@/lib/api";
import { Landmark, Link2 } from "lucide-react";

interface Account {
  id: string; name: string; type: string; subtype: string | null;
  mask: string | null; currentBalance: string; currency: string;
  isActive: boolean; provider: string; connectionName: string;
}

const TYPE_LABEL: Record<string, string> = {
  depository: "Checking / Savings",
  credit: "Credit card",
  investment: "Investment",
  loan: "Loan",
  import: "CSV import",
  demo: "Demo",
};

export default function AccountsPage() {
  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: () => apiGet("/accounts"),
    refetchInterval: 30_000,
  });

  const totalBalance = accounts
    .filter((a) => a.isActive && a.type !== "credit" && a.type !== "loan")
    .reduce((sum, a) => sum + Number(a.currentBalance), 0);

  return (
    <RequireAuth>
      <AppShell>
        <h2 className="text-3xl font-bold">Accounts</h2>
        <p className="mt-1 text-slate-500 text-sm">
          Accounts are read-only — synced from SimpleFIN or imported via CSV.
        </p>

        {isLoading ? (
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="mt-10 text-center space-y-3">
            <Landmark className="mx-auto h-10 w-10 text-slate-300" />
            <p className="font-semibold text-slate-600">No accounts yet</p>
            <p className="text-sm text-slate-400 max-w-xs mx-auto">
              Connect a bank via SimpleFIN or import a CSV to start tracking balances and transactions.
            </p>
            <div className="flex gap-3 justify-center mt-4">
              <Link
                href="/connections"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Link2 className="h-4 w-4" /> Connect bank
              </Link>
              <Link
                href="/imports"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Import CSV
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6 mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total liquid balance</p>
                <p className="text-2xl font-bold text-slate-900">
                  {totalBalance.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Checking + savings accounts only (excludes credit & loans)
                </p>
              </div>
              <Landmark className="h-8 w-8 text-slate-300" />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 bg-slate-50 border-b">
                    <th className="px-4 py-3 font-medium">Account</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Mask</th>
                    <th className="px-4 py-3 font-medium text-right">Balance</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id} className="border-t hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium">{a.name}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {TYPE_LABEL[a.type] ?? a.type}
                        {a.subtype && <span className="text-xs text-slate-400 ml-1">({a.subtype})</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                        {a.mask ? `•••• ${a.mask}` : "—"}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-medium ${Number(a.currentBalance) < 0 ? "text-red-600" : "text-slate-900"}`}>
                        {Number(a.currentBalance).toLocaleString("en-US", {
                          style: "currency",
                          currency: a.currency || "USD",
                        })}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{a.connectionName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${a.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                          {a.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </AppShell>
    </RequireAuth>
  );
}
