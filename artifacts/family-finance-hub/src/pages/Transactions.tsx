import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { apiGet, apiPatch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

interface Transaction {
  id: string; date: string; description: string;
  merchantName: string | null; amount: string; direction: string;
  userReviewed: boolean; excludedFromBudget: boolean;
  notes: string | null; categoryId: string | null;
  categoryName: string | null; categoryColor: string | null;
  accountId: string; accountName: string;
}

interface Category { id: string; name: string; color: string; }
interface Account { id: string; name: string; }

const money = (v: number) =>
  Math.abs(v).toLocaleString("en-US", { style: "currency", currency: "USD" });

function SkeletonRow() {
  return (
    <tr className="border-t">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="py-3 pr-4">
          <div className="h-4 rounded bg-slate-100 animate-pulse" style={{ width: `${40 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function TransactionsPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [account, setAccount] = useState(params.get("account") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [uncategorized, setUncategorized] = useState(params.get("uncategorized") === "1");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const queryParams = new URLSearchParams();
  if (q) queryParams.set("q", q);
  if (account) queryParams.set("account", account);
  if (category) queryParams.set("category", category);
  if (uncategorized) queryParams.set("uncategorized", "1");
  queryParams.set("limit", "300");

  const { data: txs = [], isLoading, isError, refetch } = useQuery<Transaction[]>({
    queryKey: ["transactions", q, account, category, uncategorized],
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
    mutationFn: ({ id, ...data }: { id: string } & Partial<Transaction>) =>
      apiPatch<Transaction>(`/transactions/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const markReviewed = (tx: Transaction) =>
    updateTx.mutate({ id: tx.id, userReviewed: !tx.userReviewed });

  const saveNote = (id: string) => {
    updateTx.mutate({ id, notes: noteText });
    setEditingNotes(null);
  };

  const unreviewedCount = txs.filter((t) => !t.userReviewed).length;

  return (
    <RequireAuth>
      <AppShell>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Review transactions</h2>
            <p className="mt-1 text-slate-500 text-sm">
              Categorize, review, and annotate. Changes save instantly.
            </p>
          </div>
          {unreviewedCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4" /> {unreviewedCount} unreviewed
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          {isError && (
            <div className="p-5 flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle className="h-5 w-5" />
              Failed to load transactions.
              <button onClick={() => refetch()} className="underline">Retry</button>
            </div>
          )}
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Merchant / Description</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium">Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
              {!isLoading && txs.map((tx) => {
                const amt = Number(tx.amount);
                const isExpense = tx.direction === "expense";
                return (
                  <tr
                    key={tx.id}
                    className={`border-t transition-colors ${tx.userReviewed ? "" : "bg-amber-50/40"}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {tx.date.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">
                      {tx.accountName}
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="font-medium truncate">{tx.merchantName ?? tx.description}</p>
                      {tx.merchantName && (
                        <p className="text-xs text-slate-400 truncate">{tx.description}</p>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right whitespace-nowrap font-mono font-medium ${isExpense ? "text-red-600" : "text-green-700"}`}>
                      {isExpense ? "-" : "+"}{money(amt)}
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
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm bg-white"
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
                    <td className="px-4 py-3 max-w-[140px]">
                      {editingNotes === tx.id ? (
                        <div className="flex gap-1">
                          <input
                            autoFocus
                            className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveNote(tx.id);
                              if (e.key === "Escape") setEditingNotes(null);
                            }}
                          />
                          <button onClick={() => saveNote(tx.id)} className="text-blue-600 text-xs">✓</button>
                        </div>
                      ) : (
                        <button
                          className="text-left text-xs text-slate-400 hover:text-slate-700 truncate max-w-full"
                          onClick={() => { setEditingNotes(tx.id); setNoteText(tx.notes ?? ""); }}
                        >
                          {tx.notes ?? "add note…"}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => markReviewed(tx)}
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
              No transactions found. Adjust filters or sync your accounts.
            </p>
          )}
          {txs.length > 0 && (
            <div className="px-4 py-3 border-t text-xs text-slate-400 text-right">
              {txs.length} transaction{txs.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </AppShell>
    </RequireAuth>
  );
}
