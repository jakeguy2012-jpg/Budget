import { ReactNode, useEffect } from "react";
import { useMe } from "@/lib/auth";
import { useLocation } from "wouter";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useMe();
  const [, nav] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      nav("/login");
    }
  }, [user, isLoading, nav]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
