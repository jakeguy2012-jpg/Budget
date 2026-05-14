import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { apiGet, apiPost } from "@/lib/api";

interface SyncRun { id: string; startedAt: string; status: string; transactionsInserted: number; errorMessage: string | null; }
interface Connection { id: string; name: string; provider: string; isActive: boolean; lastSyncedAt: string | null; syncRuns: SyncRun[]; }

export default function ConnectionsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("SimpleFIN");
  const [credential, setCredential] = useState("");

  const { data: connections = [], isLoading } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => apiGet("/connections"),
  });

  const create = useMutation({
    mutationFn: (data: { provider: string; name: string; credential: string }) => apiPost("/connections", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections"] });
      setCredential("");
    },
  });

  const sync = useMutation({
    mutationFn: (id: string) => apiPost(`/connections/${id}/sync`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
  });

  return (
    <RequireAuth>
      <AppShell>
        <h2 className="text-3xl font-bold">Connections</h2>
        <p className="text-slate-500">Read-only bank data connections. This app cannot initiate payments, transfers, ACH, card actions, or account changes.</p>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
          <h3 className="font-semibold">Add SimpleFIN</h3>
          <p className="my-2 text-sm text-amber-700">Paste your SimpleFIN setup/access URL. It is encrypted at rest and never logged, but protect it like a password.</p>
          <form
            onSubmit={(e) => { e.preventDefault(); create.mutate({ provider: "simplefin", name, credential }); }}
            className="grid gap-3"
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Connection name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[80px]"
              placeholder="SimpleFIN access URL"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              required
            />
            <button type="submit" disabled={create.isPending} className="w-fit inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {create.isPending ? "Saving..." : "Save read-only connection"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
          <h3 className="font-semibold">Current connections</h3>
          {isLoading ? (
            <p className="mt-4 text-slate-500">Loading...</p>
          ) : connections.length === 0 ? (
            <p className="mt-4 text-slate-400">No connections yet.</p>
          ) : (
            connections.map((c) => (
              <div className="mt-4 rounded-xl border p-4" key={c.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-slate-500">{c.provider} · last sync {c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleString() : "never"}</p>
                  </div>
                  <button
                    onClick={() => sync.mutate(c.id)}
                    disabled={sync.isPending}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Manual sync
                  </button>
                </div>
                <div className="mt-3 text-xs text-slate-500 space-y-1">
                  {c.syncRuns.map((r) => (
                    <p key={r.id}>{new Date(r.startedAt).toLocaleString()} — {r.status} — inserted {r.transactionsInserted}</p>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </AppShell>
    </RequireAuth>
  );
}
