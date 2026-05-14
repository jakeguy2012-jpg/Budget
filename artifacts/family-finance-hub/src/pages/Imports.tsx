import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function ImportsPage() {
  const { toast } = useToast();
  const [csv, setCsv] = useState("");
  const [dateColumn, setDateColumn] = useState("date");
  const [descriptionColumn, setDescriptionColumn] = useState("description");
  const [amountColumn, setAmountColumn] = useState("amount");
  const [merchantColumn, setMerchantColumn] = useState("");
  const [accountColumn, setAccountColumn] = useState("account");

  const importCsv = useMutation({
    mutationFn: (data: object) => apiPost("/imports", data),
    onSuccess: (res: any) => {
      toast({ title: "Imported!", description: `${res.imported} new transactions added.` });
      setCsv("");
    },
    onError: (err: Error) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <RequireAuth>
      <AppShell>
        <h2 className="text-3xl font-bold">CSV imports</h2>
        <p className="text-slate-500">Import bank or card CSVs with simple column mapping. Duplicate rows are skipped by a stable fingerprint.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            importCsv.mutate({ csv, dateColumn, descriptionColumn, amountColumn, merchantColumn: merchantColumn || undefined, accountColumn: accountColumn || undefined });
          }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6 grid gap-3"
        >
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-48"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder="Paste CSV here..."
            required
          />
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Date column</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={dateColumn} onChange={(e) => setDateColumn(e.target.value)} placeholder="date" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Description column</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={descriptionColumn} onChange={(e) => setDescriptionColumn(e.target.value)} placeholder="description" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Amount column</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={amountColumn} onChange={(e) => setAmountColumn(e.target.value)} placeholder="amount" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Merchant column (optional)</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={merchantColumn} onChange={(e) => setMerchantColumn(e.target.value)} placeholder="merchant" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Account column (optional)</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={accountColumn} onChange={(e) => setAccountColumn(e.target.value)} placeholder="account" />
            </div>
          </div>
          <button
            type="submit"
            disabled={importCsv.isPending}
            className="w-fit inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {importCsv.isPending ? "Importing..." : "Import CSV"}
          </button>
        </form>
      </AppShell>
    </RequireAuth>
  );
}
