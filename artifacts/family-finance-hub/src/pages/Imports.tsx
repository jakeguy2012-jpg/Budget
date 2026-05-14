import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { FileUp, CheckCircle2, Info } from "lucide-react";

const EXAMPLE_CSV = `date,description,amount,merchant,account
2024-01-05,GROCERY STORE,-82.14,Whole Foods,Chase Checking
2024-01-06,PAYROLL,3000.00,,Chase Checking
2024-01-07,NETFLIX SUBSCRIPTION,-15.49,Netflix,Chase Checking`;

export default function ImportsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [csv, setCsv] = useState("");
  const [dateColumn, setDateColumn] = useState("date");
  const [descriptionColumn, setDescriptionColumn] = useState("description");
  const [amountColumn, setAmountColumn] = useState("amount");
  const [merchantColumn, setMerchantColumn] = useState("merchant");
  const [accountColumn, setAccountColumn] = useState("account");
  const [lastResult, setLastResult] = useState<{ imported: number } | null>(null);

  const importCsv = useMutation({
    mutationFn: (data: object) => apiPost<{ imported: number }>("/imports", data),
    onSuccess: (res) => {
      setLastResult(res);
      toast({
        title: `Import complete`,
        description: `${res.imported} new transaction${res.imported !== 1 ? "s" : ""} added. Duplicates were skipped.`,
      });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setCsv("");
    },
    onError: (err: Error) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <RequireAuth>
      <AppShell>
        <h2 className="text-3xl font-bold">Import CSV</h2>
        <p className="mt-1 text-slate-500 text-sm">
          Paste exported bank/card CSV data. Duplicate rows are skipped automatically using a stable fingerprint.
        </p>

        {/* How it works */}
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 mt-5 text-sm text-blue-800">
          <div className="flex items-center gap-2 font-semibold mb-2">
            <Info className="h-4 w-4" /> How CSV import works
          </div>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>Paste raw CSV text from your bank's export (most banks offer this)</li>
            <li>Map your column names — headers must match exactly (case-insensitive)</li>
            <li>Amounts: positive = income, negative = expense</li>
            <li>Re-importing the same file is safe — duplicates are detected and skipped</li>
            <li>All imported transactions land in a "CSV Imports" connection you can review</li>
          </ul>
        </section>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            importCsv.mutate({
              csv,
              dateColumn,
              descriptionColumn,
              amountColumn,
              merchantColumn: merchantColumn || undefined,
              accountColumn: accountColumn || undefined,
            });
          }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-4 space-y-4"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">CSV data</label>
              <button
                type="button"
                onClick={() => setCsv(EXAMPLE_CSV)}
                className="text-xs text-blue-600 hover:underline"
              >
                Load example
              </button>
            </div>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono min-h-52 resize-y"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder="Paste CSV here (including header row)…"
              required
              spellCheck={false}
            />
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Column mapping</p>
            <p className="text-xs text-slate-500 mb-3">
              Enter the exact column header names from your CSV (case-insensitive).
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Date column *", value: dateColumn, set: setDateColumn, placeholder: "date" },
                { label: "Description column *", value: descriptionColumn, set: setDescriptionColumn, placeholder: "description" },
                { label: "Amount column *", value: amountColumn, set: setAmountColumn, placeholder: "amount" },
                { label: "Merchant column (optional)", value: merchantColumn, set: setMerchantColumn, placeholder: "merchant" },
                { label: "Account column (optional)", value: accountColumn, set: setAccountColumn, placeholder: "account" },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <label className="block text-xs text-slate-500 mb-1">{label}</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={importCsv.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <FileUp className="h-4 w-4" />
              {importCsv.isPending ? "Importing…" : "Import CSV"}
            </button>

            {lastResult && (
              <span className="flex items-center gap-1.5 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                {lastResult.imported} transactions added
              </span>
            )}
          </div>
        </form>
      </AppShell>
    </RequireAuth>
  );
}
