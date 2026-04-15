import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { EVENT_TYPES } from "@/lib/config";
import type { EventType, EventStatus } from "@/lib/types";
import { ModuleManager } from "@/components/admin/module-manager";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  // Migré Prisma → Convex : query unifiée getForAdmin
  const event = await convexClient.query(api.events.getForAdmin, {
    id: params.id as Id<"events">,
    email: session.user.email,
  });

  if (!event) notFound();

  const eventConfig = EVENT_TYPES[event.type as EventType];

  const confirmed = event.guestStats.CONFIRMED ?? 0;
  const declined = event.guestStats.DECLINED ?? 0;
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

  const firstDate = event.dates[0] ?? 0;
  const daysUntil = Math.ceil((firstDate - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="flex flex-col h-full gap-3 lg:gap-4 overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 shrink-0">
        <Link href="/events" className="hover:text-[#7A3A50] dark:hover:text-[#C48B90]">
          Événements
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300">{event.title}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl lg:text-3xl">{eventConfig?.icon ?? "📅"}</span>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white">{event.title}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColor[event.status as EventStatus]}`}>
                {statusLabel[event.status as EventStatus]}
              </span>
            </div>
            <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {eventConfig?.label} · {new Date(firstDate).toLocaleDateString("fr-FR", {
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

        <div className="flex items-center gap-2 flex-wrap mt-2 sm:mt-0">
          <Link
            href={`/${event.slug}`}
            target="_blank"
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 sm:py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            👁️ Prévisualiser
          </Link>
          <form action={`/api/events/${event._id}/status`} method="POST">
            <input type="hidden" name="status" value={statusActions[event.status as EventStatus].nextStatus} />
            <button
              type="submit"
              className={`rounded-xl px-3 py-2 sm:py-1.5 text-sm font-medium text-white transition ${statusActions[event.status as EventStatus].color}`}
            >
              {statusActions[event.status as EventStatus].label}
            </button>
          </form>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 shrink-0">
        <Link
          href={`/events/${event._id}/guests`}
          className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 lg:p-4 shadow-sm hover:border-[#7A3A50]/20 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">👥</span>
            <span className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{event._count.guests}</span>
          </div>
          <p className="mt-1 text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-[#7A3A50]">
            Invités totaux
          </p>
          <div className="mt-1 flex gap-2 text-[10px] lg:text-[11px]">
            <span className="text-green-600">✅ {confirmed}</span>
            <span className="text-red-500">❌ {declined}</span>
            <span className="text-gray-400">⏳ {pending}</span>
          </div>
        </Link>

        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 lg:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-lg">📦</span>
            <span className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
              {event.modules.filter((m) => m.active).length}
            </span>
          </div>
          <p className="mt-1 text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">Modules actifs</p>
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 lg:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-lg">💬</span>
            <span className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
              {event._count.chatMessages}
            </span>
          </div>
          <p className="mt-1 text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">Messages</p>
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 lg:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-lg">🎨</span>
            <span className="text-sm lg:text-lg font-bold capitalize text-gray-900 dark:text-white">
              {event.theme?.preset || "—"}
            </span>
          </div>
          <p className="mt-1 text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">Thème</p>
        </div>
      </div>

      {/* Share link — compact */}
      <div className="rounded-xl border border-[#7A3A50]/10 dark:border-[#7A3A50]/20 bg-[#7A3A50]/5 dark:bg-[#7A3A50]/10 px-4 py-3 sm:py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-900 dark:text-white">🔗 Lien de partage</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
            {process.env.NEXTAUTH_URL || "https://evenement.ga"}/{event.slug}
          </p>
        </div>
        <Link
          href={`/events/${event._id}/guests`}
          className="rounded-lg bg-[#7A3A50] px-3 py-2 sm:py-1.5 text-xs font-medium text-white hover:bg-[#6A2A40] transition shrink-0 text-center"
        >
          + Ajouter des invités
        </Link>
      </div>

      {/* Module Manager */}
      <div className="flex-1 min-h-0 flex flex-col">
        <h2 className="mb-2 text-sm lg:text-base font-semibold text-gray-900 dark:text-white shrink-0">
          Modules
        </h2>
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <ModuleManager
            eventId={event._id}
            modules={event.modules.map((m) => ({
              id: m._id,
              type: m.type,
              active: m.active,
              order: m.order,
            }))}
            userPlan={session.user.plan}
          />
        </div>
      </div>
    </div>
  );
}
