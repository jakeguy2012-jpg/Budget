import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { apiGet, apiPost } from "@/lib/api";

interface Category { id: string; name: string; color: string; icon: string; isDefault: boolean; }

const COLORS = ["#2563eb","#16a34a","#f97316","#7c3aed","#dc2626","#0891b2","#4f46e5","#db2777","#65a30d","#ca8a04"];

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiGet("/categories"),
  });

  const create = useMutation({
    mutationFn: (data: { name: string; color: string }) => apiPost("/categories", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setName("");
    },
  });

  return (
    <RequireAuth>
      <AppShell>
        <h2 className="text-3xl font-bold">Categories</h2>

        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate({ name, color }); }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6 flex gap-3 items-end"
        >
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Category name</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Groceries"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 rounded-lg cursor-pointer" />
          </div>
          <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Add
          </button>
        </form>

        {isLoading ? (
          <p className="mt-6 text-slate-500">Loading...</p>
        ) : (
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {categories.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
                <span className="h-4 w-4 rounded-full flex-shrink-0" style={{ background: c.color }} />
                <span className="font-medium">{c.name}</span>
                {c.isDefault && <span className="ml-auto text-xs text-slate-400">default</span>}
              </div>
            ))}
          </div>
        )}
      </AppShell>
    </RequireAuth>
  );
}
