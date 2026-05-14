import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useMe, useLogout } from "@/lib/auth";
import { DemoBanner } from "@/components/DemoBanner";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Tags,
  Wand2,
  Landmark,
  Link2,
  FileUp,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { useState } from "react";

const links = [
  { label: "Home",        href: "/dashboard",    icon: LayoutDashboard },
  { label: "Review",      href: "/transactions", icon: ArrowLeftRight },
  { label: "Budgets",     href: "/budgets",      icon: PiggyBank },
  { label: "Categories",  href: "/categories",   icon: Tags },
  { label: "Rules",       href: "/rules",        icon: Wand2 },
  { label: "Accounts",    href: "/accounts",     icon: Landmark },
  { label: "Connections", href: "/connections",  icon: Link2 },
  { label: "Imports",     href: "/imports",      icon: FileUp },
  { label: "Settings",    href: "/settings",     icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useMe();
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r bg-white flex flex-col transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-slate-900">Family Finance Hub</h1>
          {user && (
            <p className="text-xs text-slate-500 mt-1">
              {user.name} · {user.householdName}
            </p>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {links.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                location.startsWith(href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-100",
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t">
          <button
            onClick={() => logout.mutate()}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 w-full"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b bg-white px-4 py-3 md:hidden">
        <button onClick={() => setMobileOpen(true)} className="text-slate-700">
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-900">Family Finance Hub</h1>
      </div>

      {/* Demo mode banner — visible across all pages */}
      <div className="md:ml-64">
        <DemoBanner />
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 p-4 pb-16 md:p-8">{children}</main>
    </div>
  );
}
