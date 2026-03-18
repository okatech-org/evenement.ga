import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const NAV_GROUPS = [
  {
    label: "VUE D'ENSEMBLE",
    items: [
      { href: "/superadmin", label: "Dashboard Système", icon: "📊" },
    ],
  },
  {
    label: "GESTION",
    items: [
      { href: "/superadmin/users", label: "Utilisateurs", icon: "👥" },
      { href: "/superadmin/events", label: "Événements", icon: "📅" },
      { href: "/superadmin/regulateur", label: "Modération", icon: "💬" },
    ],
  },
  {
    label: "PLATEFORME",
    items: [
      { href: "/superadmin/modules", label: "Modules Catalogue", icon: "🧩" },
      { href: "/superadmin/plans", label: "Plans & Limites", icon: "💎" },
      { href: "/superadmin/demo", label: "Comptes Démo", icon: "🎭" },
    ],
  },
  {
    label: "SYSTÈME",
    items: [
      { href: "/superadmin/logs", label: "Logs Système", icon: "📋" },
      { href: "/superadmin/config", label: "Configuration", icon: "⚙️" },
    ],
  },
];

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-[#0F1117] text-[#E6EDF3]">
      {/* ─── Sidebar ─────────────────────────────────────── */}
      <aside className="hidden w-[280px] flex-col border-r border-[#30363D] bg-[#161B22] lg:flex">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#30363D] px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7A3A50] to-[#C48B90]">
            <span className="text-sm font-bold text-white">E</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                Event<span className="text-[#C48B90]">Flow</span>
              </span>
              <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
                Système
              </span>
            </div>
            <p className="truncate text-xs text-[#8B949E]">
              {session.user.name || session.user.email}
            </p>
          </div>
          {/* System status indicator */}
          <div className="flex h-2.5 w-2.5 items-center justify-center" title="Système opérationnel">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8B949E]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#8B949E] transition-all hover:bg-[#21262D] hover:text-[#E6EDF3]"
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#30363D] px-4 py-3">
          <div className="flex items-center justify-between text-[10px] text-[#484F58]">
            <span>v1.0.0</span>
            <span>EventFlow</span>
          </div>
          <div className="mt-2 flex gap-2">
            <Link
              href="/dashboard"
              className="flex-1 rounded-md bg-[#21262D] px-3 py-1.5 text-center text-xs font-medium text-[#8B949E] transition-colors hover:bg-[#30363D] hover:text-[#E6EDF3]"
            >
              Interface Orga
            </Link>
          </div>
        </div>
      </aside>

      {/* ─── Main Content Area ───────────────────────────── */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-[#30363D] bg-[#161B22] px-6">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#7A3A50] to-[#C48B90]">
              <span className="text-xs font-bold text-white">E</span>
            </div>
            <span className="text-sm font-bold text-white">Super Admin</span>
          </div>

          {/* Breadcrumb placeholder */}
          <div className="hidden lg:flex items-center gap-1.5 text-sm text-[#8B949E]">
            <span>🛡️</span>
            <span>Administration Système</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Clock */}
            <span className="hidden sm:inline text-xs tabular-nums text-[#8B949E]">
              {new Date().toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            {/* Admin avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400">
              {session.user.name?.charAt(0).toUpperCase() || "A"}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
