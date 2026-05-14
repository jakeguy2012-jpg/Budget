export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="card"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p>{hint && <p className="mt-2 text-sm text-slate-500">{hint}</p>}</div>;
}
