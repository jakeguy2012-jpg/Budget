import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { apiGet } from "@/lib/api";
import {
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AlertCircle, ArrowRight, FileUp, Link2 } from "lucide-react";

interface DashboardSummary {
  spending: number;
  income: number;
  netCashFlow: number;
  uncategorizedCount: number;
  byCategory: Array<{ name: string; value: number; color: string }>;
  byAccount: Array<{ name: string; value: number }>;
  budgets: Array<{
    id: string; categoryId: string; categoryName: string;
    categoryColor: string; month: string; planned: string;
  }>;
}

const money = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD" });

function StatCard({
  label, value, hint, accent,
}: {
  label: string; value: string; hint?: string; accent?: "red" | "green" | "blue";
}) {
  const colors = {
    red: "text-red-600",
    green: "text-green-700",
    blue: "text-blue-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent ? colors[accent] : "text-slate-900"}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 rounded-2xl bg-slate-100" />
        <div className="h-72 rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm text-center mt-6">
      <p className="text-lg font-semibold text-slate-700">No data yet</p>
      <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
        Connect your bank via SimpleFIN or import a CSV to start tracking household spending.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/connections"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Link2 className="h-4 w-4" /> Connect a bank
        </Link>
        <Link
          href="/imports"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <FileUp className="h-4 w-4" /> Import a CSV
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiGet("/dashboard/summary"),
    refetchInterval: 60_000,
  });

  const hasData =
    data && (data.byAccount.length > 0 || data.byCategory.length > 0 || data.spending > 0 || data.income > 0);

  return (
    <RequireAuth>
      <AppShell>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm text-slate-500">
              {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
            </p>
            <h2 className="text-3xl font-bold">Household snapshot</h2>
          </div>
          {data && data.uncategorizedCount > 0 && (
            <Link
              href="/transactions?uncategorized=1"
              className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              <AlertCircle className="h-4 w-4" />
              {data.uncategorizedCount} uncategorized
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {isLoading && <Skeleton />}

        {isError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>Could not load dashboard data.</span>
            <button onClick={() => refetch()} className="ml-auto text-red-700 underline hover:no-underline">
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && data && !hasData && <EmptyState />}

        {!isLoading && !isError && data && hasData && (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Spending" value={money(data.spending)} accent="red" />
              <StatCard label="Income" value={money(data.income)} accent="green" />
              <StatCard
                label="Net cash flow"
                value={money(data.netCashFlow)}
                accent={data.netCashFlow >= 0 ? "green" : "red"}
              />
              <StatCard
                label="Needs review"
                value={String(data.uncategorizedCount)}
                hint="uncategorized transactions"
                accent={data.uncategorizedCount > 0 ? "red" : undefined}
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold">Spending by category</h3>
                {data.byCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={data.byCategory}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {data.byCategory.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => money(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-slate-400 mt-4">No categorized spending yet.</p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold">Spending by account</h3>
                {data.byAccount.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.byAccount} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={50} />
                      <Tooltip formatter={(v: number) => money(v)} />
                      <Bar dataKey="value" name="Spending" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-slate-400 mt-4">No account data yet.</p>
                )}
              </section>
            </div>

            {data.budgets.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Budget progress</h3>
                  <Link href="/budgets" className="text-sm text-blue-600 hover:underline">
                    Edit budgets →
                  </Link>
                </div>
                <div className="space-y-4">
                  {data.budgets.map((budget) => {
                    const actual =
                      data.byCategory.find((c) => c.name === budget.categoryName)?.value ?? 0;
                    const planned = Number(budget.planned);
                    const pct = planned ? Math.min((actual / planned) * 100, 100) : 0;
                    const over = actual > planned;
                    return (
                      <div key={budget.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                              style={{ background: budget.categoryColor }}
                            />
                            {budget.categoryName}
                          </span>
                          <span className={over ? "text-red-600 font-medium" : "text-slate-600"}>
                            {money(actual)} / {money(planned)}
                            {over && " ⚠ over budget"}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-2.5 rounded-full transition-all ${over ? "bg-red-500" : "bg-green-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </AppShell>
    </RequireAuth>
  );
}
