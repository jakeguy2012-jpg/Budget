import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { apiGet } from "@/lib/api";
import { PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardSummary {
  spending: number;
  income: number;
  netCashFlow: number;
  uncategorizedCount: number;
  byCategory: Array<{ name: string; value: number; color: string }>;
  byAccount: Array<{ name: string; value: number }>;
  budgets: Array<{ id: string; categoryId: string; categoryName: string; categoryColor: string; month: string; planned: string }>;
}

const money = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD" });

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiGet("/dashboard/summary"),
  });

  return (
    <RequireAuth>
      <AppShell>
        <div className="mb-6">
          <p className="text-sm text-slate-500">This month</p>
          <h2 className="text-3xl font-bold">Household snapshot</h2>
        </div>

        {isLoading ? (
          <div className="text-slate-500">Loading...</div>
        ) : data ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Spending" value={money(data.spending)} />
              <StatCard label="Income" value={money(data.income)} />
              <StatCard label="Net cash flow" value={money(data.netCashFlow)} />
              <StatCard label="Needs review" value={String(data.uncategorizedCount)} hint="uncategorized transactions" />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold">Spending by category</h3>
                {data.byCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={data.byCategory} dataKey="value" nameKey="name" outerRadius={90}>
                        {data.byCategory.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => money(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-slate-400 mt-4">No spending data yet</p>
                )}
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold">Spending by account</h3>
                {data.byAccount.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.byAccount}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(v: number) => money(v)} />
                      <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-slate-400 mt-4">No account data yet</p>
                )}
              </section>
            </div>

            {data.budgets.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
                <h3 className="mb-4 font-semibold">Budget left</h3>
                <div className="space-y-3">
                  {data.budgets.map((budget) => {
                    const actual = data.byCategory.find((c) => c.name === budget.categoryName)?.value ?? 0;
                    const planned = Number(budget.planned);
                    return (
                      <div key={budget.id}>
                        <div className="flex justify-between text-sm">
                          <span>{budget.categoryName}</span>
                          <span>{money(planned - actual)} left</span>
                        </div>
                        <div className="mt-1 h-3 rounded-full bg-slate-100">
                          <div
                            className={`h-3 rounded-full ${actual > planned ? "bg-red-500" : "bg-green-500"}`}
                            style={{ width: `${planned ? Math.min((actual / planned) * 100, 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        ) : null}
      </AppShell>
    </RequireAuth>
  );
}
