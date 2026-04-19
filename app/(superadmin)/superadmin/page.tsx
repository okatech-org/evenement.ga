import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard Système — Super Admin",
};

async function getSystemStats() {
  try {
    const [
      totalUsers,
      totalEvents,
      totalGuests,
      totalRsvps,
      recentUsers,
      recentEvents,
      recentLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.guest.count(),
      prisma.rSVP.count(),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.event.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { guests: true } },
        },
      }),
      prisma.systemLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        where: { level: { in: ["WARNING", "ERROR", "CRITICAL"] } },
      }),
    ]);

    // Plan distribution
    const planDist = await prisma.user.groupBy({
      by: ["plan"],
      _count: true,
    });

    // Event type distribution
    const typeDist = await prisma.event.groupBy({
      by: ["type"],
      _count: true,
    });

    // This month stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [usersThisMonth, eventsThisMonth, guestsThisMonth] =
      await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.event.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.guest.count({ where: { createdAt: { gte: startOfMonth } } }),
      ]);

    return {
      totalUsers,
      totalEvents,
      totalGuests,
      totalRsvps,
      usersThisMonth,
      eventsThisMonth,
      guestsThisMonth,
      recentUsers,
      recentEvents,
      recentLogs,
      planDist: planDist.map((p) => ({
        plan: p.plan,
        count: p._count,
      })),
      typeDist: typeDist.map((t) => ({
        type: t.type,
        count: t._count,
      })),
    };
  } catch (error) {
    console.error("[SuperAdmin Dashboard] Error:", error);
    return null;
  }
}

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-gray-500/20 text-gray-400",
  ESSENTIEL: "bg-blue-500/20 text-blue-400",
  PREMIUM: "bg-amber-500/20 text-amber-400",
  ENTREPRISE: "bg-purple-500/20 text-purple-400",
};

const LEVEL_COLORS: Record<string, string> = {
  INFO: "bg-blue-500/20 text-blue-400",
  WARNING: "bg-amber-500/20 text-amber-400",
  ERROR: "bg-red-500/20 text-red-400",
  CRITICAL: "bg-red-600/30 text-red-300",
};

const EVENT_TYPE_ICONS: Record<string, string> = {
  MARIAGE: "💍",
  ANNIVERSAIRE: "🎂",
  DEUIL: "🕊️",
  BAPTEME: "👶",
  CONFERENCE: "🎤",
  PRIVE: "✨",
};

export default async function SuperAdminDashboard() {
  const stats = await getSystemStats();

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#8B949E]">
          Erreur de chargement des statistiques système.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Système</h1>
        <p className="mt-1 text-sm text-[#8B949E]">
          Vue d&apos;ensemble de la plateforme EventFlow
        </p>
      </div>

      {/* ─── System Status ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "API", status: "operational" },
          { label: "Base de données", status: "operational" },
          { label: "Redis", status: "degraded" },
          { label: "Emails", status: "operational" },
        ].map((service) => (
          <div
            key={service.label}
            className="flex items-center gap-2.5 rounded-lg border border-[#30363D] bg-[#161B22] px-4 py-3"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                service.status === "operational"
                  ? "bg-emerald-500"
                  : service.status === "degraded"
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
            />
            <span className="text-sm text-[#E6EDF3]">{service.label}</span>
          </div>
        ))}
      </div>

      {/* ─── KPI Cards ───────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            label: "Utilisateurs",
            value: stats.totalUsers,
            change: `+${stats.usersThisMonth} ce mois`,
            icon: "👥",
          },
          {
            label: "Événements",
            value: stats.totalEvents,
            change: `+${stats.eventsThisMonth} ce mois`,
            icon: "📅",
          },
          {
            label: "Invités total",
            value: stats.totalGuests,
            change: `+${stats.guestsThisMonth} ce mois`,
            icon: "🎫",
          },
          {
            label: "RSVP reçus",
            value: stats.totalRsvps,
            change: `${stats.totalGuests > 0 ? Math.round((stats.totalRsvps / stats.totalGuests) * 100) : 0}% taux réponse`,
            icon: "✅",
          },
          {
            label: "Plans payants",
            value: stats.planDist
              .filter((p) => p.plan !== "FREE")
              .reduce((a, b) => a + b.count, 0),
            change: `sur ${stats.totalUsers} utilisateurs`,
            icon: "💎",
          },
          {
            label: "Types d'événements",
            value: stats.typeDist.length,
            change: `${stats.typeDist.map((t) => EVENT_TYPE_ICONS[t.type] || "📌").join(" ")}`,
            icon: "📊",
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#30363D] bg-[#161B22] p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#8B949E]">{kpi.label}</span>
              <span className="text-lg">{kpi.icon}</span>
            </div>
            <p className="mt-2 text-3xl font-bold tabular-nums text-white">
              {kpi.value.toLocaleString("fr-FR")}
            </p>
            <p className="mt-1 text-xs text-[#8B949E]">{kpi.change}</p>
          </div>
        ))}
      </div>

      {/* ─── Distribution Charts ─────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plan distribution */}
        <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">
            Répartition des Plans
          </h3>
          <div className="space-y-3">
            {stats.planDist.map((p) => {
              const pct =
                stats.totalUsers > 0
                  ? Math.round((p.count / stats.totalUsers) * 100)
                  : 0;
              return (
                <div key={p.plan}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-[#E6EDF3]">{p.plan}</span>
                    <span className="text-[#8B949E]">
                      {p.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#21262D]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        p.plan === "FREE"
                          ? "bg-gray-500"
                          : p.plan === "ESSENTIEL"
                            ? "bg-blue-500"
                            : p.plan === "PREMIUM"
                              ? "bg-amber-500"
                              : "bg-purple-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Event type distribution */}
        <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">
            Types d&apos;Événements
          </h3>
          <div className="space-y-3">
            {stats.typeDist.map((t) => {
              const pct =
                stats.totalEvents > 0
                  ? Math.round((t.count / stats.totalEvents) * 100)
                  : 0;
              return (
                <div key={t.type}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-[#E6EDF3]">
                      {EVENT_TYPE_ICONS[t.type] || "📌"} {t.type}
                    </span>
                    <span className="text-[#8B949E]">
                      {t.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#21262D]">
                    <div
                      className="h-full rounded-full bg-[#b59e5e] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Recent Activity (3 columns) ─────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent users */}
        <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Derniers inscrits
            </h3>
            <Link
              href="/superadmin/users"
              className="text-xs text-[#b59e5e] hover:underline"
            >
              Voir tout →
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#21262D] text-xs font-bold text-[#8B949E]">
                  {user.name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-[#E6EDF3]">
                    {user.name || "—"}
                  </p>
                  <p className="truncate text-xs text-[#484F58]">
                    {user.email}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${PLAN_COLORS[user.plan] || ""}`}
                >
                  {user.plan}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent events */}
        <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Derniers événements
            </h3>
            <Link
              href="/superadmin/events"
              className="text-xs text-[#b59e5e] hover:underline"
            >
              Voir tout →
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <span className="mt-0.5 text-base">
                  {EVENT_TYPE_ICONS[event.type] || "📌"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-[#E6EDF3]">
                    {event.title}
                  </p>
                  <p className="text-xs text-[#484F58]">
                    {event.user.name || event.user.email} ·{" "}
                    {event._count.guests} invités
                  </p>
                </div>
                <span className="mt-0.5 rounded bg-[#21262D] px-1.5 py-0.5 text-[10px] text-[#8B949E]">
                  {event.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent alerts */}
        <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Alertes récentes
            </h3>
            <Link
              href="/superadmin/logs"
              className="text-xs text-[#b59e5e] hover:underline"
            >
              Voir tout →
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentLogs.length === 0 ? (
              <p className="text-center text-sm text-[#484F58] py-4">
                ✅ Aucune alerte récente
              </p>
            ) : (
              stats.recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${LEVEL_COLORS[log.level] || ""}`}
                  >
                    {log.level}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-[#E6EDF3]">
                      {log.action}
                    </p>
                    <p className="text-xs text-[#484F58]">
                      {log.category} ·{" "}
                      {log.createdAt.toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── Quick Actions ───────────────────────────────── */}
      <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Actions rapides
        </h3>
        <div className="flex flex-wrap gap-3">
          {[
            { href: "/superadmin/demo", label: "Gérer les données démo", icon: "🎭" },
            { href: "/superadmin/config", label: "Configuration système", icon: "⚙️" },
            { href: "/superadmin/logs?level=ERROR", label: "Logs d'erreur", icon: "🚨" },
            { href: "/superadmin/users", label: "Gérer utilisateurs", icon: "👥" },
            { href: "/superadmin/plans", label: "Plans & Limites", icon: "💎" },
            { href: "/superadmin/config#maintenance", label: "Mode maintenance", icon: "🔧" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex items-center gap-2 rounded-lg border border-[#30363D] bg-[#0F1117] px-4 py-2.5 text-sm font-medium text-[#8B949E] transition-all hover:border-[#484F58] hover:bg-[#21262D] hover:text-[#E6EDF3]"
            >
              <span>{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
