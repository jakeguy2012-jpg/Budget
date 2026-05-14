import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { apiGet, apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Info } from "lucide-react";
import type { ReactElement } from "react";

interface SyncRun {
  id: string; startedAt: string; status: string;
  transactionsInserted: number; transactionsUpdated: number;
  accountsSynced: number; errorMessage: string | null;
}
interface Connection {
  id: string; name: string; provider: string;
  isActive: boolean; lastSyncedAt: string | null; syncRuns: SyncRun[];
}

const STATUS_ICON: Record<string, ReactElement> = {
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  failed: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  running: <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin" />,
};

export default function ConnectionsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("My Bank");
  const [credential, setCredential] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { data: connections = [], isLoading } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => apiGet("/connections"),
    refetchInterval: 15_000,
  });

  const create = useMutation({
    mutationFn: (data: { provider: string; name: string; credential: string }) =>
      apiPost("/connections", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections"] });
      setCredential("");
      setShowForm(false);
      toast({ title: "Connection saved", description: "Credentials encrypted and stored. You can now sync." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const sync = useMutation({
    mutationFn: (id: string) => {
      setSyncingId(id);
      return apiPost<{ message: string }>(`/connections/${id}/sync`, {});
    },
    onSuccess: (_data, id) => {
      toast({ title: "Sync started", description: "Transactions will appear shortly." });
      // Poll for updates
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["connections"] });
        qc.invalidateQueries({ queryKey: ["transactions"] });
        qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
        setSyncingId(null);
      }, 4000);
    },
    onError: (err: Error) => {
      setSyncingId(null);
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <RequireAuth>
      <AppShell>
        <h2 className="text-3xl font-bold">Bank connections</h2>
        <p className="mt-1 text-slate-500">
          Read-only access to bank transaction data via SimpleFIN.
          This app can only read transactions — it cannot initiate payments, transfers, ACH, or account changes.
        </p>

        {/* What is SimpleFIN */}
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 mt-6 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-blue-800">
            <Info className="h-4 w-4" /> How SimpleFIN works
          </div>
          <p className="text-sm text-blue-900">
            <strong>SimpleFIN Bridge</strong> (<a href="https://bridge.simplefin.org" target="_blank" rel="noopener noreferrer" className="underline">bridge.simplefin.org</a>)
            is an intermediary that lets you grant <em>read-only</em> access to your bank accounts.
            You log in to your bank through SimpleFIN's secure interface — your credentials never touch this app.
          </p>
          <ol className="text-sm text-blue-900 list-decimal list-inside space-y-1">
            <li>Go to <strong>bridge.simplefin.org</strong> and create an account</li>
            <li>Add your bank (SimpleFIN fetches balances and transactions read-only)</li>
            <li>In the SimpleFIN dashboard, generate a <em>Setup Token</em></li>
            <li>Exchange the token for an Access URL using their API or docs</li>
            <li>Paste the Access URL below — it will be <strong>AES-256 encrypted</strong> before storage</li>
          </ol>
          <p className="text-xs text-blue-700 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Credentials are encrypted at rest with AES-256-GCM and never appear in logs.
          </p>
        </section>

        {/* Safety warning */}
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mt-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 space-y-1">
            <p className="font-semibold">Before connecting a real account</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-700">
              <li>This app is <strong>not audited for production use</strong> — treat it as personal/beta software</li>
              <li>Your SimpleFIN Access URL grants read-only access to balance and transaction data only</li>
              <li>Revoke access at any time from bridge.simplefin.org → Account → Connections</li>
              <li>Never share your access URL — protect it like a password</li>
            </ul>
          </div>
        </section>

        {/* Add connection */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Add a SimpleFIN connection</h3>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + Add connection
              </button>
            )}
          </div>

          {showForm && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate({ provider: "simplefin", name, credential });
              }}
              className="mt-4 grid gap-3"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Connection name</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="e.g. Chase checking"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SimpleFIN access URL</label>
                <textarea
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[90px] font-mono text-xs"
                  placeholder="https://beta-bridge.simplefin.org/simplefin/..."
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  required
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="mt-1 text-xs text-slate-500">
                  This URL will be AES-256 encrypted before storage and never logged.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={create.isPending}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {create.isPending ? "Encrypting & saving..." : "Save read-only connection"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setCredential(""); }}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Existing connections */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
          <h3 className="font-semibold mb-4">Active connections</h3>

          {isLoading && <p className="text-slate-500 text-sm">Loading...</p>}

          {!isLoading && connections.length === 0 && (
            <p className="text-slate-400 text-sm">
              No connections yet. Add a SimpleFIN access URL above to start syncing.
            </p>
          )}

          <div className="space-y-4">
            {connections.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Provider: <span className="font-medium">SimpleFIN</span> ·{" "}
                      {c.isActive ? (
                        <span className="text-green-700">active</span>
                      ) : (
                        <span className="text-red-600">inactive</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Last sync: {c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleString() : "never"}
                    </p>
                  </div>
                  <button
                    onClick={() => sync.mutate(c.id)}
                    disabled={sync.isPending && syncingId === c.id}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncingId === c.id ? "animate-spin" : ""}`} />
                    {syncingId === c.id ? "Syncing..." : "Sync now"}
                  </button>
                </div>

                {c.syncRuns.length > 0 && (
                  <div className="mt-3 border-t pt-3 space-y-1">
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Recent sync history</p>
                    {c.syncRuns.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 text-xs text-slate-600">
                        {STATUS_ICON[r.status] ?? <div className="h-3.5 w-3.5" />}
                        <span className="text-slate-400">{new Date(r.startedAt).toLocaleString()}</span>
                        <span className="capitalize">{r.status}</span>
                        {r.status === "completed" && (
                          <span className="text-slate-400">
                            · {r.transactionsInserted} new · {r.transactionsUpdated} updated
                            · {r.accountsSynced} accounts
                          </span>
                        )}
                        {r.status === "failed" && r.errorMessage && (
                          <span className="text-red-500 truncate max-w-xs">{r.errorMessage}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* What this app cannot do */}
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 mt-6">
          <div className="flex items-center gap-2 font-semibold text-slate-700 mb-2">
            <ShieldCheck className="h-4 w-4 text-green-600" /> Read-only guarantee
          </div>
          <p className="text-sm text-slate-600">
            This app never initiates financial actions. It has no code paths for:
          </p>
          <ul className="mt-2 text-sm text-slate-600 list-disc list-inside space-y-0.5">
            <li>Payments or money transfers</li>
            <li>ACH or wire initiation</li>
            <li>Card actions (freeze, replace, limits)</li>
            <li>Account opening or closing</li>
            <li>Credential submission to your bank</li>
          </ul>
          <p className="text-xs text-slate-500 mt-3">
            SimpleFIN Bridge handles authentication with your bank in a separate, isolated session.
            Your bank login credentials are never sent to or stored by this app.
          </p>
        </section>
      </AppShell>
    </RequireAuth>
  );
}
