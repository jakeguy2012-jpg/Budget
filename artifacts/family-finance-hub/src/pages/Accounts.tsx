import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { apiGet } from "@/lib/api";

interface Account { id: string; name: string; type: string; subtype: string | null; mask: string | null; currentBalance: string; currency: string; isActive: boolean; provider: string; connectionName: string; }

export default function AccountsPage() {
  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: () => apiGet("/accounts"),
  });

  return (
    <RequireAuth>
      <AppShell>
        <h2 className="text-3xl font-bold">Accounts</h2>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6 overflow-x-auto">
          {isLoading ? (
            <p className="text-slate-500">Loading...</p>
          ) : accounts.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No accounts yet. Connect a bank or import a CSV.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Mask</th>
                  <th className="pb-3">Balance</th>
                  <th className="pb-3">Provider</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr className="border-t" key={a.id}>
                    <td className="py-3 pr-4">{a.name}</td>
                    <td className="pr-4">{a.type}</td>
                    <td className="pr-4">{a.mask ? `•••• ${a.mask}` : "—"}</td>
                    <td className="pr-4">${Number(a.currentBalance).toFixed(2)}</td>
                    <td>{a.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </AppShell>
    </RequireAuth>
  );
}
