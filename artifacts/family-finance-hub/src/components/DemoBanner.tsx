import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { FlaskConical, X } from "lucide-react";
import { useState } from "react";

interface Health {
  status: string;
  demoMode: boolean;
  syncProvider: string;
  checks: Record<string, "ok" | "error">;
}

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data } = useQuery<Health>({
    queryKey: ["healthz"],
    queryFn: () => apiGet("/healthz"),
    staleTime: 60_000,
  });

  if (dismissed || !data?.demoMode) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center gap-3 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950 shadow-sm md:pl-72">
      <FlaskConical className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">
        <strong>Demo bank sync mode</strong> — no real financial accounts connected.
        Set <code className="rounded bg-amber-300 px-1">BANK_SYNC_PROVIDER=simplefin</code> and restart to use real accounts.
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 rounded p-0.5 hover:bg-amber-300"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useIsDemoMode() {
  const { data } = useQuery<Health>({
    queryKey: ["healthz"],
    queryFn: () => apiGet("/healthz"),
    staleTime: 60_000,
  });
  return data?.demoMode ?? false;
}

export function useSyncProvider() {
  const { data } = useQuery<Health>({
    queryKey: ["healthz"],
    queryFn: () => apiGet("/healthz"),
    staleTime: 60_000,
  });
  return data?.syncProvider ?? "simplefin";
}

export function useHealthChecks() {
  return useQuery<Health>({
    queryKey: ["healthz"],
    queryFn: () => apiGet("/healthz"),
    staleTime: 30_000,
  });
}
