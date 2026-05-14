import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { apiGet, apiPatch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

interface Transaction {
  id: string; date: string; description: string;
  merchantName: string | null; amount: string; direction: string;
  userReviewed: boolean; excludedFromBudget: boolean;
  notes: string | null; categoryId: string | null;
  categoryName: string | null; categoryColor: string | null;
  accountId: string; accountName: string;
}
interface Category { id: string; name: string; color: string; }
interface Account  { id: string; name: string; }

const money = (v: number) =>
  Math.abs(v).toLocaleString("en-US", { style: "currency", currency: "USD" });

// Default date range: last 90 days
const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = iso(new Date());
const ago90  = iso(new Date(Date.now() - 90 * 86400_000));

function SkeletonRow() {
  return (
    <tr className="border-t">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="py-3 px-4">
          <div className="h-4 rounded bg-slate-100 animate-pulse" style={{ width: `${40 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function TransactionsPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);

  const [q,            setQ]            = useState(params.get("q") ?? "");
  const [account,      setAccount]      = useState(params.get("account") ?? "");
  const [category,     setCategory]     = useState(params.get("category") ?? "");
  const [direction,    setDirection]    = useState("");
  const [uncategorized,setUncategorized]= useState(params.get("uncategorized") === "1");
  const [dateFrom,     setDateFrom]     = useState(ago90);
  const [dateTo,       setDateTo]       = useState(today);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText,     setNoteText]     = useState("");

  const { toast } = useToast();
  const qc = useQueryClient();

  const queryParams = new URLSearchParams();
  if (q)             queryParams.set("q", q);
  if (account)       queryParams.set("account", account);
  if (category)      queryParams.set("category", category);
  if (direction)     queryParams.set("direction", direction);
  if (uncategorized) queryParams.set("uncategorized", "1");
  if (dateFrom)      queryParams.set("dateFrom", dateFrom);
  if (dateTo)        queryParams.set("dateTo", dateTo);
  queryParams.set("limit", "500");

  const { data: txs = [], isLoading, isError, refetch, isFetching } = useQuery<Transaction[]>({
    queryKey: ["transactions", q, account, category, direction, uncategorized, dateFrom, dateTo],
    queryFn: () => apiGet(`/transactions?${queryParams}`),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiGet("/categories"),
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: () => apiGet("/accounts"),
  });

  const updateTx = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiPatch<Transaction>(`/transactions/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const saveNote = (id: string) => {
    updateTx.mutate({ id, notes: noteText });
    setEditingNotes(null);
  };

  const unreviewedCount = txs.filter((t) => !t.userReviewed).length;

  return (
    <RequireAuth>
      <AppShell>
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-3xl font-bold">Review transactions</h2>
            <p className="mt-1 text-slate-500 text-sm">
              Categorize, review, and annotate. Changes save instantly.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isFetching && !isLoading && (
              <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />
            )}
            {unreviewedCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-sm text-amber-800">
                <AlertCircle className="h-4 w-4" /> {unreviewedCount} unreviewed
              </span>
            )}
          </div>
        </div>

        {/* ── Filters ────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Search merchant or description…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="">All accounts</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            >
              <option value="">Income + expenses</option>
              <option value="expense">Expenses only</option>
              <option value="income">Income only</option>
              <option value="transfer">Transfers only</option>
            </select>
          </div>

          {/* Date range + uncategorized */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <label className="text-slate-500 whitespace-nowrap">From</label>
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <label className="text-slate-500">to</label>
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                value={dateTo}
                min={dateFrom}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded"
                checked={uncategorized}
                onChange={(e) => setUncategorized(e.target.checked)}
              />
              Needs review only
            </label>
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          {isError && (
            <div className="p-5 flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle className="h-5 w-5" />
              Failed to load transactions.
              <button onClick={() => refetch()} className="underline">Retry</button>
            </div>
          )}

          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-left text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Merchant / Description</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium text-center">✓</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}

              {!isLoading && txs.map((tx) => {
                const amt = Number(tx.amount);
                const isExpense  = tx.direction === "expense";
                const isIncome   = tx.direction === "income";
                const isTransfer = tx.direction === "transfer";

                return (
                  <tr
                    key={tx.id}
                    className={`border-t transition-colors hover:bg-slate-50/50 ${tx.userReviewed ? "" : "bg-amber-50/30"}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">
                      {tx.date.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[110px] truncate text-xs">
                      {tx.accountName}
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="font-medium truncate">{tx.merchantName ?? tx.description}</p>
                      {tx.merchantName && (
                        <p className="text-xs text-slate-400 truncate">{tx.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-medium">
                      <span className={
                        isExpense  ? "text-red-600" :
                        isIncome   ? "text-green-700" :
                        isTransfer ? "text-slate-500" :
                        "text-slate-700"
                      }>
                        {isExpense ? "−" : isIncome ? "+" : ""}{money(amt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[160px]">
                      <div className="flex items-center gap-1.5">
                        {tx.categoryColor && (
                          <span
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ background: tx.categoryColor }}
                          />
                        )}
                        <select
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs bg-white"
                          value={tx.categoryId ?? ""}
                          onChange={(e) =>
                            updateTx.mutate({ id: tx.id, categoryId: e.target.value || null })
                          }
                        >
                          <option value="">Uncategorized</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[130px]">
                      {editingNotes === tx.id ? (
                        <div className="flex gap-1">
                          <input
                            autoFocus
                            className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs min-w-0"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveNote(tx.id);
                              if (e.key === "Escape") setEditingNotes(null);
                            }}
                          />
                          <button onClick={() => saveNote(tx.id)} className="text-blue-600 text-xs px-1">✓</button>
                        </div>
                      ) : (
                        <button
                          className="text-left text-xs text-slate-400 hover:text-slate-700 truncate max-w-full w-full"
                          onClick={() => { setEditingNotes(tx.id); setNoteText(tx.notes ?? ""); }}
                        >
                          {tx.notes ?? <span className="italic">add note…</span>}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => updateTx.mutate({ id: tx.id, userReviewed: !tx.userReviewed })}
                        title={tx.userReviewed ? "Mark unreviewed" : "Mark reviewed"}
                        className={`rounded-full p-1 transition-colors ${tx.userReviewed ? "text-green-600 hover:text-slate-400" : "text-slate-300 hover:text-green-500"}`}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!isLoading && txs.length === 0 && !isError && (
            <p className="text-center text-slate-400 py-12 text-sm">
              No transactions match your filters. Try widening the date range or clearing filters.
            </p>
          )}

          {txs.length > 0 && (
            <div className="px-4 py-3 border-t text-xs text-slate-400 flex justify-between items-center">
              <span>{txs.length} transaction{txs.length !== 1 ? "s" : ""}</span>
              <span className="text-slate-300">
                {dateFrom} → {dateTo}
              </span>
            </div>
          )}
        </div>
      </AppShell>
    </RequireAuth>
  );
}
