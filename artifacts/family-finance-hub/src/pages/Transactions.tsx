import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { apiGet, apiPatch } from "@/lib/api";

interface Transaction {
  id: string;
  date: string;
  description: string;
  merchantName: string | null;
  amount: string;
  direction: string;
  userReviewed: boolean;
  excludedFromBudget: boolean;
  notes: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  accountId: string;
  accountName: string;
}

interface Category { id: string; name: string; color: string; }
interface Account { id: string; name: string; }

const money = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function TransactionsPage() {
  const [q, setQ] = useState("");
  const [account, setAccount] = useState("");
  const [category, setCategory] = useState("");
  const [uncategorized, setUncategorized] = useState(false);
  const qc = useQueryClient();

  const { data: txs = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["transactions", q, account, category, uncategorized],
    queryFn: () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (account) params.set("account", account);
      if (category) params.set("category", category);
      if (uncategorized) params.set("uncategorized", "1");
      return apiGet(`/transactions?${params}`);
    },
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
    mutationFn: ({ id, ...data }: { id: string; categoryId?: string | null }) =>
      apiPatch(`/transactions/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  return (
    <RequireAuth>
      <AppShell>
        <h2 className="text-3xl font-bold">Review transactions</h2>
        <p className="mt-1 text-slate-500">Search, categorize, mark reviewed, or exclude items from the budget.</p>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6 grid gap-3 md:grid-cols-5">
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Search"
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={uncategorized}
              onChange={(e) => setUncategorized(e.target.checked)}
            />
            Needs review
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6 overflow-x-auto">
          {isLoading ? (
            <p className="text-slate-500">Loading...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Account</th>
                  <th className="pb-3">Merchant / Description</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Reviewed</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx) => (
                  <tr className="border-t" key={tx.id}>
                    <td className="py-3 pr-4 whitespace-nowrap">{tx.date.slice(0, 10)}</td>
                    <td className="pr-4">{tx.accountName}</td>
                    <td className="pr-4">{tx.merchantName ?? tx.description}</td>
                    <td className={`pr-4 whitespace-nowrap ${Number(tx.amount) < 0 ? "text-red-600" : "text-green-700"}`}>
                      {money(Number(tx.amount))}
                    </td>
                    <td className="pr-4">
                      <select
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                        value={tx.categoryId ?? ""}
                        onChange={(e) => updateTx.mutate({ id: tx.id, categoryId: e.target.value || null })}
                      >
                        <option value="">Uncategorized</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td>{tx.userReviewed ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!isLoading && txs.length === 0 && (
            <p className="text-center text-slate-400 py-8">No transactions found.</p>
          )}
        </div>
      </AppShell>
    </RequireAuth>
  );
}
