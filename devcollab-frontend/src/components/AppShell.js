"use client";
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoutes";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  CheckSquare,
  Sparkles,
  Bell,
  Settings
} from "lucide-react";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Organizations", href: "/organizations", icon: Building2 },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "AI Assistant", href: "/ai-assistant", icon: Sparkles },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Profile", href: "/profile", icon: Settings }
];

export default function AppShell({
  children,
  title,
  description,
  backHref,
  backLabel,
  actions
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="flex min-h-screen">
          <aside className="hidden lg:flex w-72 flex-col border-r border-slate-800 bg-slate-950">
            <div className="p-6 border-b border-slate-800">
              <Link href="/dashboard" className="block">
                <p className="text-sm text-blue-400 font-semibold">DevCollaborator</p>
                <h1 className="text-xl font-bold mt-1">Workspace OS</h1>
              </Link>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      active
                        ? "flex items-center gap-3 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition-colors"
                        : "flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
                    }
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-900"
              >
                Logout
              </button>
            </div>
          </aside>

          <section className="flex-1 min-w-0">
            <header className="border-b border-slate-800 bg-slate-950/80">
              <div className="px-4 sm:px-6 lg:px-8 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    {backHref && backLabel && (
                      <Link href={backHref} className="text-sm text-blue-400 hover:text-blue-300">
                        ← {backLabel}
                      </Link>
                    )}

                    <h1 className="text-2xl font-bold mt-2">{title}</h1>

                    {description && (
                      <p className="text-slate-400 mt-1">{description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex lg:hidden gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {navItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900"
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      ))}
                    </div>

                    {actions}

                    <button
                      onClick={handleLogout}
                      className="lg:hidden rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </header>

            <div className="px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
