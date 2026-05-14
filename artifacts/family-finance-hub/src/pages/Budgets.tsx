import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { apiGet, apiPost } from "@/lib/api";

interface Budget { id: string; categoryId: string; categoryName: string; categoryColor: string; month: string; planned: string; }
interface Category { id: string; name: string; color: string; }

export default function BudgetsPage() {
  const qc = useQueryClient();
  const [categoryId, setCategoryId] = useState("");
  const [planned, setPlanned] = useState("");

  const { data: budgets = [], isLoading } = useQuery<Budget[]>({
    queryKey: ["budgets"],
    queryFn: () => apiGet("/budgets"),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiGet("/categories"),
  });

  const create = useMutation({
    mutationFn: (data: { categoryId: string; planned: number }) => apiPost("/budgets", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setCategoryId("");
      setPlanned("");
    },
  });

  return (
    <RequireAuth>
      <AppShell>
        <h2 className="text-3xl font-bold">Budgets</h2>
        <p className="text-slate-500">Set simple monthly planned spending by category.</p>

        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate({ categoryId, planned: Number(planned) }); }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6 flex gap-3 items-end"
        >
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Monthly budget ($)</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              type="number"
              min="0"
              step="0.01"
              value={planned}
              onChange={(e) => setPlanned(e.target.value)}
              required
              placeholder="500.00"
            />
          </div>
          <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Save
          </button>
        </form>

        {isLoading ? (
          <p className="mt-6 text-slate-500">Loading...</p>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
            {budgets.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No budgets set for this month.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Planned</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map((b) => (
                    <tr className="border-t" key={b.id}>
                      <td className="py-3 flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: b.categoryColor }} />
                        {b.categoryName}
                      </td>
                      <td>${Number(b.planned).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </AppShell>
    </RequireAuth>
  );
}
