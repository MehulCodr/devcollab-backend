"use client";
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoutes";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard"
  },
  {
    label: "Recommendations",
    href: "/recommendations"
  },
  {
    label: "Profile",
    href: "/profile"
  },
  {
    label: "Notifications",
    href: "/notifications"
  }
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

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      active
                        ? "block rounded-xl bg-blue-600 px-4 py-3 font-medium text-white"
                        : "block rounded-xl px-4 py-3 font-medium text-slate-400 hover:bg-slate-900 hover:text-white"
                    }
                  >
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
                    <div className="flex lg:hidden gap-3">
                      <Link
                        href="/dashboard"
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900"
                      >
                        Dashboard
                      </Link>

                      <Link
                        href="/recommendations"
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900"
                      >
                        Recommendations
                      </Link>

                      <Link
                        href="/notifications"
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900"
                      >
                        Notifications
                      </Link>

                      <Link
                        href="/profile"
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900"
                      >
                        Profile
                      </Link>
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
