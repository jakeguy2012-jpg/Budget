import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface Category { id: string; name: string; color: string; }
interface Rule { id: string; categoryId: string; categoryName: string; merchantContains: string | null; descriptionContains: string | null; priority: number; excludeFromBudget: boolean; isActive: boolean; }
interface Suggestion { merchantName: string | null; count: number; }
interface RulesPage { rules: Rule[]; categories: Category[]; suggestions: Suggestion[]; }

export default function RulesPage() {
  const qc = useQueryClient();
  const [merchant, setMerchant] = useState("");
  const [desc, setDesc] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("100");

  const { data, isLoading } = useQuery<RulesPage>({
    queryKey: ["rules"],
    queryFn: () => apiGet("/rules"),
  });

  const rules = data?.rules ?? [];
  const categories = data?.categories ?? [];
  const suggestions = data?.suggestions ?? [];

  const create = useMutation({
    mutationFn: (d: { categoryId: string; merchantContains?: string; descriptionContains?: string; priority?: number }) => apiPost("/rules", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rules"] }); setMerchant(""); setDesc(""); },
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }: { id: string } & Partial<Rule>) => apiPatch(`/rules/${id}`, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });

  const applyRules = useMutation({
    mutationFn: () => apiPost("/rules/apply", {}),
    onSuccess: (res: any) => { qc.invalidateQueries({ queryKey: ["transactions"] }); alert(`Applied ${res.applied} rules`); },
  });

  return (
    <RequireAuth>
      <AppShell>
        <h2 className="text-3xl font-bold">Rules</h2>
        <p className="text-slate-500">Rules automatically categorize repeated merchants. Suggestions must be approved before saving.</p>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
          <h3 className="font-semibold">Create rule</h3>
          <form
            onSubmit={(e) => { e.preventDefault(); create.mutate({ categoryId, merchantContains: merchant || undefined, descriptionContains: desc || undefined, priority: Number(priority) }); }}
            className="mt-3 grid gap-3 md:grid-cols-5"
          >
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Merchant contains" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Description contains" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" type="number" placeholder="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} />
            <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save</button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Active rules</h3>
            <button onClick={() => applyRules.mutate()} disabled={applyRules.isPending} className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              Re-run rules
            </button>
          </div>
          {isLoading ? <p className="mt-4 text-slate-500">Loading...</p> : rules.length === 0 ? (
            <p className="mt-4 text-slate-400">No rules yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {rules.map((r) => (
                <div key={r.id} className="grid gap-2 rounded-xl border p-3 md:grid-cols-6">
                  <input
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    defaultValue={r.merchantContains ?? ""}
                    placeholder="Merchant"
                    onBlur={(e) => update.mutate({ id: r.id, merchantContains: e.target.value || null })}
                  />
                  <input
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    defaultValue={r.descriptionContains ?? ""}
                    placeholder="Description"
                    onBlur={(e) => update.mutate({ id: r.id, descriptionContains: e.target.value || null })}
                  />
                  <select
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    defaultValue={r.categoryId}
                    onChange={(e) => update.mutate({ id: r.id, categoryId: e.target.value })}
                  >
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    type="number"
                    defaultValue={r.priority}
                    onBlur={(e) => update.mutate({ id: r.id, priority: Number(e.target.value) })}
                  />
                  <button onClick={() => update.mutate({ id: r.id })} className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-700">Update</button>
                  <button onClick={() => remove.mutate(r.id)} className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {suggestions.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
            <h3 className="font-semibold">Suggested rules</h3>
            {suggestions.map((s) => (
              <form
                key={s.merchantName}
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const cat = (form.elements.namedItem("categoryId") as HTMLSelectElement).value;
                  create.mutate({ categoryId: cat, merchantContains: s.merchantName ?? "" });
                }}
                className="mt-3 flex items-center gap-3"
              >
                <span className="flex-1">{s.merchantName} appears {s.count} times</span>
                <select name="categoryId" className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Approve</button>
              </form>
            ))}
          </section>
        )}
      </AppShell>
    </RequireAuth>
  );
}
