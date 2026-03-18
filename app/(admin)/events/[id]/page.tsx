import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { EVENT_TYPES } from "@/lib/config";
import type { EventType, EventStatus } from "@prisma/client";
import { ModuleManager } from "@/components/admin/module-manager";

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const event = await prisma.event.findUnique({
    where: { id: params.id, userId: session.user.id },
    include: {
      theme: true,
      modules: { orderBy: { order: "asc" } },
      _count: { select: { guests: true, chatMessages: true } },
    },
  });

  if (!event) notFound();

  const eventConfig = EVENT_TYPES[event.type as EventType];

  // Get confirmed / declined counts
  const guestStats = await prisma.guest.groupBy({
    by: ["status"],
    where: { eventId: event.id },
    _count: true,
  });

  const confirmed = guestStats.find((s) => s.status === "CONFIRMED")?._count || 0;
  const declined = guestStats.find((s) => s.status === "DECLINED")?._count || 0;
  const pending = event._count.guests - confirmed - declined;

  const statusActions: Record<EventStatus, { label: string; nextStatus: EventStatus; color: string }> = {
    DRAFT: { label: "Publier", nextStatus: "PUBLISHED", color: "bg-green-600 hover:bg-green-700" },
    PUBLISHED: { label: "Archiver", nextStatus: "ARCHIVED", color: "bg-gray-600 hover:bg-gray-700" },
    ARCHIVED: { label: "Réactiver", nextStatus: "DRAFT", color: "bg-blue-600 hover:bg-blue-700" },
  };

  const statusColor: Record<EventStatus, string> = {
    DRAFT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    ARCHIVED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  };

  const statusLabel: Record<EventStatus, string> = {
    DRAFT: "Brouillon",
    PUBLISHED: "Publié",
    ARCHIVED: "Archivé",
  };

  const daysUntil = Math.ceil(
    (new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
        <Link href="/events" className="hover:text-[#7A3A50] dark:hover:text-[#C48B90]">
          Événements
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300">{event.title}</span>
      </div>

      {/* Header — compact */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{eventConfig?.icon ?? "📅"}</span>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{event.title}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColor[event.status]}`}>
                {statusLabel[event.status]}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {eventConfig?.label} · {new Date(event.date).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {daysUntil > 0 && (
                <span className="ml-2 text-[#7A3A50] dark:text-[#C48B90] font-medium">
                  (J-{daysUntil})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/${event.slug}`}
            target="_blank"
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            👁️ Prévisualiser
          </Link>
          <form action={`/api/events/${event.id}/status`} method="POST">
            <input type="hidden" name="status" value={statusActions[event.status].nextStatus} />
            <button
              type="submit"
              className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition ${statusActions[event.status].color}`}
            >
              {statusActions[event.status].label}
            </button>
          </form>
        </div>
      </div>

      {/* ═══ Command Center — Stats + Share ═══ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href={`/events/${event.id}/guests`}
          className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:border-[#7A3A50]/20 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xl">👥</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{event._count.guests}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-[#7A3A50] dark:group-hover:text-[#C48B90]">
            Invités totaux
          </p>
          <div className="mt-2 flex gap-2 text-[11px]">
            <span className="text-green-600 dark:text-green-400">✅ {confirmed}</span>
            <span className="text-red-500 dark:text-red-400">❌ {declined}</span>
            <span className="text-gray-400">⏳ {pending}</span>
          </div>
        </Link>

        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xl">📦</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {event.modules.filter((m) => m.active).length}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">Modules actifs</p>
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xl">💬</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {event._count.chatMessages}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">Messages</p>
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xl">🎨</span>
            <span className="text-lg font-bold capitalize text-gray-900 dark:text-white">
              {event.theme?.preset || "—"}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">Thème</p>
        </div>
      </div>

      {/* Share link */}
      <div className="rounded-xl border border-[#7A3A50]/10 dark:border-[#7A3A50]/20 bg-[#7A3A50]/5 dark:bg-[#7A3A50]/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">🔗 Lien de partage</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
            {process.env.NEXTAUTH_URL || "https://evenement.ga"}/{event.slug}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/events/${event.id}/guests`}
            className="rounded-lg bg-[#7A3A50] px-4 py-2 text-sm font-medium text-white hover:bg-[#6A2A40] transition"
          >
            + Ajouter des invités
          </Link>
        </div>
      </div>

      {/* Module Manager */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Modules
        </h2>
        <ModuleManager
          eventId={event.id}
          modules={event.modules.map((m) => ({
            id: m.id,
            type: m.type,
            active: m.active,
            order: m.order,
          }))}
          userPlan={session.user.plan}
        />
      </div>
    </div>
  );
}
