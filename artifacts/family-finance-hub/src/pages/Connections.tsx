import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useHealthChecks } from "@/components/DemoBanner";
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, Info, FlaskConical, Trash2,
} from "lucide-react";
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

// ── Guided wizard steps ────────────────────────────────────────────────────
type Mode = "choose" | "demo" | "simplefin";

export default function ConnectionsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: health } = useHealthChecks();
  const demoMode = health?.demoMode ?? false;

  const [mode, setMode] = useState<Mode>("choose");
  const [name, setName] = useState("My Bank");
  const [credential, setCredential] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);

  const { data: connections = [], isLoading } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => apiGet("/connections"),
    refetchInterval: 15_000,
  });

  const create = useMutation({
    mutationFn: (data: { provider: string; name: string; credential?: string }) =>
      apiPost("/connections", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections"] });
      setCredential("");
      setMode("choose");
      toast({ title: "Connection saved", description: "First sync will begin shortly." });
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
    onSuccess: () => {
      toast({ title: "Sync started", description: "Results will appear in sync history." });
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["connections"] });
        qc.invalidateQueries({ queryKey: ["transactions"] });
        qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
        setSyncingId(null);
      }, 5000);
    },
    onError: (err: Error) => {
      setSyncingId(null);
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteConn = useMutation({
    mutationFn: (id: string) => apiDelete(`/connections/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setDeletingId(null);
      toast({ title: "Connection deleted", description: "All accounts and transactions removed." });
    },
    onError: (err: Error) => {
      setDeletingId(null);
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <RequireAuth>
      <AppShell>
        <h2 className="text-3xl font-bold">Bank connections</h2>
        <p className="mt-1 text-slate-500 text-sm">
          Read-only sync of account balances and transactions.
          This app <strong>cannot</strong> initiate payments, transfers, ACH, or account changes.
        </p>

        {/* ── Step 1: choose provider ──────────────────────────────────────── */}
        {mode === "choose" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
            <h3 className="font-semibold mb-1">Add a connection</h3>
            <p className="text-sm text-slate-500 mb-5">
              Choose how you want to connect. Start with demo mode if you want to explore the app without a bank subscription.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Demo option */}
              <button
                onClick={() => setMode("demo")}
                className="text-left rounded-xl border-2 border-amber-300 bg-amber-50 p-4 hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-2 font-semibold text-amber-800 mb-1">
                  <FlaskConical className="h-4 w-4" /> Demo sync (no subscription)
                </div>
                <p className="text-sm text-amber-700">
                  Generates realistic fake accounts and transactions instantly.
                  No SimpleFIN Bridge subscription required. Safe to try first.
                </p>
              </button>

              {/* Real SimpleFIN option */}
              <button
                onClick={() => setMode("simplefin")}
                className="text-left rounded-xl border-2 border-blue-300 bg-blue-50 p-4 hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-2 font-semibold text-blue-800 mb-1">
                  <ShieldCheck className="h-4 w-4" /> Real SimpleFIN (requires subscription)
                </div>
                <p className="text-sm text-blue-700">
                  Connect a real bank via SimpleFIN Bridge. Requires a paid SimpleFIN Bridge subscription
                  and an access URL.
                </p>
              </button>
            </div>
          </section>
        )}

        {/* ── Demo connection form ─────────────────────────────────────────── */}
        {mode === "demo" && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm mt-6">
            <div className="flex items-center gap-2 font-semibold text-amber-800 mb-3">
              <FlaskConical className="h-4 w-4" /> Add demo connection
            </div>
            <p className="text-sm text-amber-800 mb-4">
              This creates a fake bank with checking, savings, and credit card accounts populated with
              realistic demo transactions spanning 3 months. Syncing twice will not create duplicates.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate({ provider: "demo", name: "Demo Bank" });
              }}
              className="flex gap-3 flex-wrap"
            >
              <button
                type="submit"
                disabled={create.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                <FlaskConical className="h-4 w-4" />
                {create.isPending ? "Creating…" : "Add demo connection"}
              </button>
              <button
                type="button"
                onClick={() => setMode("choose")}
                className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </form>
          </section>
        )}

        {/* ── SimpleFIN form ───────────────────────────────────────────────── */}
        {mode === "simplefin" && (
          <>
            {/* Safety warning */}
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mt-6 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 space-y-1">
                <p className="font-semibold">Before connecting a real account</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                  <li>Test with demo mode first — make sure sync, review, and export work</li>
                  <li>SimpleFIN Bridge may require a paid subscription</li>
                  <li>Start with one low-risk account (e.g. checking only)</li>
                  <li>Your access URL grants read-only balance + transaction access only</li>
                  <li>Revoke anytime at bridge.simplefin.org → Account → Connections</li>
                  <li>Never paste your access URL into chat, logs, or screenshots</li>
                </ul>
              </div>
            </section>

            {/* How SimpleFIN works */}
            <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 mt-4">
              <div className="flex items-center gap-2 font-semibold text-blue-800 mb-2">
                <Info className="h-4 w-4" /> How to get a SimpleFIN access URL
              </div>
              <ol className="text-sm text-blue-900 list-decimal list-inside space-y-1">
                <li>Go to <a href="https://bridge.simplefin.org" target="_blank" rel="noopener noreferrer" className="underline">bridge.simplefin.org</a> and create an account</li>
                <li>Subscribe to SimpleFIN Bridge (paid — required for real bank access)</li>
                <li>Add your bank inside SimpleFIN Bridge (your bank credentials never reach this app)</li>
                <li>In SimpleFIN Bridge, go to <strong>Settings → Access URLs → Create</strong></li>
                <li>Copy the generated access URL (starts with <code className="bg-blue-100 px-1 rounded">https://beta-bridge…</code>)</li>
                <li>Paste it below — it will be AES-256-GCM encrypted before storage</li>
              </ol>
              <p className="text-xs text-blue-700 mt-3 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Your bank login credentials are never sent to or stored by this app.
              </p>
            </section>

            {/* Connection form */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-4">
              <h3 className="font-semibold mb-3">SimpleFIN connection details</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate({ provider: "simplefin", name, credential });
                }}
                className="grid gap-3"
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
                    placeholder="https://beta-bridge.simplefin.org/simplefin/…"
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    required
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Encrypted with AES-256-GCM before storage. Never logged. Never returned to the frontend.
                  </p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button
                    type="submit"
                    disabled={create.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {create.isPending ? "Encrypting & saving…" : "Save read-only connection"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode("choose"); setCredential(""); }}
                    className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          </>
        )}

        {/* ── Active connections ───────────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Active connections</h3>
            {mode === "choose" && connections.length > 0 && (
              <button
                onClick={() => setMode("choose")}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add another
              </button>
            )}
          </div>

          {isLoading && <p className="text-slate-500 text-sm">Loading…</p>}

          {!isLoading && connections.length === 0 && (
            <p className="text-slate-400 text-sm">
              No connections yet. Add a demo or SimpleFIN connection above to start syncing.
            </p>
          )}

          <div className="space-y-4">
            {connections.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {c.provider === "demo" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <FlaskConical className="h-3 w-3" /> Demo
                        </span>
                      )}
                      <p className="font-semibold truncate">{c.name}</p>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {c.isActive ? (
                        <span className="text-green-700">active</span>
                      ) : (
                        <span className="text-red-600">inactive</span>
                      )}{" "}
                      · Last sync:{" "}
                      {c.lastSyncedAt
                        ? new Date(c.lastSyncedAt).toLocaleString()
                        : "never"}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => sync.mutate(c.id)}
                      disabled={sync.isPending && syncingId === c.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncingId === c.id ? "animate-spin" : ""}`} />
                      {syncingId === c.id ? "Syncing…" : "Sync"}
                    </button>

                    {deletingId === c.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => deleteConn.mutate(c.id)}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                        >
                          Confirm delete
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="rounded-lg border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(c.id)}
                        title="Delete connection and all data"
                        className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {c.syncRuns.length > 0 && (
                  <div className="mt-3 border-t pt-3 space-y-1.5">
                    <p className="text-xs font-medium text-slate-500 mb-1">Recent sync history</p>
                    {c.syncRuns.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 text-xs text-slate-600">
                        {STATUS_ICON[r.status] ?? <div className="h-3.5 w-3.5" />}
                        <span className="text-slate-400">
                          {new Date(r.startedAt).toLocaleString()}
                        </span>
                        <span className="capitalize">{r.status}</span>
                        {r.status === "completed" && (
                          <span className="text-slate-400">
                            · {r.transactionsInserted} new · {r.transactionsUpdated} updated ·{" "}
                            {r.accountsSynced} accounts
                          </span>
                        )}
                        {r.status === "failed" && r.errorMessage && (
                          <span className="text-red-500 truncate max-w-xs" title={r.errorMessage}>
                            {r.errorMessage}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Real-account readiness checklist ─────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
          <button
            className="flex items-center justify-between w-full text-left"
            onClick={() => setShowChecklist((v) => !v)}
          >
            <h3 className="font-semibold">Real-account readiness checklist</h3>
            <span className="text-xs text-blue-600">{showChecklist ? "Hide" : "Show"}</span>
          </button>

          {showChecklist && (
            <div className="mt-4 space-y-2 text-sm">
              {[
                { label: "Demo sync tested — accounts and transactions appeared correctly" },
                { label: "Synced twice — no duplicate transactions created" },
                { label: "Database persistence confirmed (restarted app, data still present)" },
                { label: "Transactions CSV export downloaded and verified" },
                { label: "APP_ENCRYPTION_KEY set in Replit Secrets (not just dev env)" },
                { label: "SESSION_SECRET set in Replit Secrets" },
                { label: "Confirmed no raw SimpleFIN tokens appear in API responses or UI" },
                { label: "SimpleFIN Bridge subscription active" },
                { label: "Tested with one low-risk account before connecting all accounts" },
                { label: "Understand how to revoke access: bridge.simplefin.org → Account → Connections" },
              ].map(({ label }) => (
                <label key={label} className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5 rounded flex-shrink-0" />
                  <span className="text-slate-700">{label}</span>
                </label>
              ))}
              <p className="mt-3 text-xs text-slate-500 border-t pt-3">
                Complete all items before connecting real financial accounts. This app is not audited — treat it as personal/beta software.
              </p>
            </div>
          )}
        </section>

        {/* ── Read-only guarantee ──────────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mt-4">
          <div className="flex items-center gap-2 font-semibold text-slate-700 mb-2">
            <ShieldCheck className="h-4 w-4 text-green-600" /> Read-only guarantee
          </div>
          <ul className="text-sm text-slate-600 list-disc list-inside space-y-0.5">
            <li>No payments, transfers, or ACH</li>
            <li>No card actions (freeze, replace, limits)</li>
            <li>No account opening or closing</li>
            <li>Bank login credentials never touch this app</li>
            <li>SimpleFIN decrypted in memory only — never logged</li>
          </ul>
        </section>
      </AppShell>
    </RequireAuth>
  );
}
