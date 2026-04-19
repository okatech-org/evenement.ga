import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Profil Utilisateur — Super Admin" };

export default async function SuperAdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { guests: true } } },
      },
      _count: {
        select: { events: true, chatMessages: true, notifications: true },
      },
    },
  });

  if (!user) notFound();

  const recentLogs = await prisma.systemLog.findMany({
    where: { actorId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const PLAN_COLORS: Record<string, string> = {
    FREE: "bg-gray-500/20 text-gray-400",
    ESSENTIEL: "bg-blue-500/20 text-blue-400",
    PREMIUM: "bg-amber-500/20 text-amber-400",
    ENTREPRISE: "bg-purple-500/20 text-purple-400",
  };

  const ROLE_COLORS: Record<string, string> = {
    ORGANIZER: "bg-emerald-500/20 text-emerald-400",
    CO_ORGANIZER: "bg-teal-500/20 text-teal-400",
    GUEST_PREVIEW: "bg-gray-500/20 text-gray-400",
    MODERATOR: "bg-amber-500/20 text-amber-400",
    ADMIN: "bg-blue-500/20 text-blue-400",
    SUPER_ADMIN: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#8B949E]">
        <Link href="/superadmin/users" className="hover:text-white">
          Utilisateurs
        </Link>
        <span>/</span>
        <span className="text-[#E6EDF3]">{user.name || user.email}</span>
      </div>

      {/* User header */}
      <div className="flex items-start gap-5 rounded-xl border border-[#30363D] bg-[#161B22] p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#21262D] text-2xl font-bold text-[#8B949E]">
          {user.name?.charAt(0).toUpperCase() || "?"}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">
            {user.name || "Sans nom"}
          </h1>
          <p className="text-sm text-[#8B949E]">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ROLE_COLORS[user.role]}`}>
              {user.role}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PLAN_COLORS[user.plan]}`}>
              {user.plan}
            </span>
            {user.isDemoAccount && (
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                DÉMO — {user.demoAccountType}
              </span>
            )}
          </div>
        </div>
        <div className="text-right text-xs text-[#484F58]">
          <p>Inscrit le {user.createdAt.toLocaleDateString("fr-FR")}</p>
          <p>ID: {user.id}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Événements", value: user._count.events },
          { label: "Messages chat", value: user._count.chatMessages },
          { label: "Notifications", value: user._count.notifications },
          { label: "Logs récents", value: recentLogs.length },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-[#30363D] bg-[#161B22] p-4 text-center"
          >
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-[#8B949E]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Events list */}
      <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">Événements</h2>
        {user.events.length === 0 ? (
          <p className="text-sm text-[#484F58]">Aucun événement créé.</p>
        ) : (
          <div className="space-y-3">
            {user.events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-lg bg-[#0F1117] p-3"
              >
                <div>
                  <p className="text-sm font-medium text-[#E6EDF3]">
                    {event.title}
                  </p>
                  <p className="text-xs text-[#484F58]">
                    {event.type} · {event._count.guests} invités ·{" "}
                    {event.date.toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#21262D] px-1.5 py-0.5 text-[10px] text-[#8B949E]">
                    {event.status}
                  </span>
                  <Link
                    href={`/${event.slug}`}
                    target="_blank"
                    className="text-xs text-[#b59e5e] hover:underline"
                  >
                    Voir →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity log */}
      <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">
          Activité récente
        </h2>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-[#484F58]">Aucune activité enregistrée.</p>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 rounded-lg bg-[#0F1117] px-3 py-2"
              >
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    log.level === "ERROR" || log.level === "CRITICAL"
                      ? "bg-red-500/20 text-red-400"
                      : log.level === "WARNING"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {log.level}
                </span>
                <span className="flex-1 truncate text-sm text-[#E6EDF3]">
                  {log.action}
                </span>
                <span className="shrink-0 text-xs text-[#484F58]">
                  {log.createdAt.toLocaleString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
