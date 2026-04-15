import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EVENT_TYPES } from "@/lib/config";
import type { EventType, EventStatus } from "@/lib/types";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  // ─── Fetch unique : tout ce dont la page a besoin ──────
  // Résolution par email pour éviter les IDs obsolètes dans le JWT.
  const data = await convexClient.query(api.events.getDashboardData, {
    email: session.user.email,
  });

  const {
    events,
    totalEvents,
    totalGuests,
    publishedEvents,
    confirmedGuests,
    recentRSVPs,
  } = data;

  // Prochain événement : première date future (events.dates[0] est un timestamp ms)
  const now = Date.now();
  const nextEvent = events.find(
    (e) => (e.dates[0] ?? 0) > now && e.status !== "ARCHIVED"
  );

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bonjour, {session.user.name?.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Voici un aperçu de vos événements
          </p>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 rounded-xl bg-[#7A3A50] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7A3A50]/25 transition hover:bg-[#6A2A40] hover:shadow-xl"
        >
          <span className="text-lg">+</span> Nouvel événement
        </Link>
      </div>

      {/* ═══ Hero Card — Next Event ═══ */}
      {nextEvent && (() => {
        const eventConfig = EVENT_TYPES[nextEvent.type as EventType];
        const firstDate = nextEvent.dates[0] ?? 0;
        const daysUntil = Math.ceil((firstDate - now) / (1000 * 60 * 60 * 24));
        return (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7A3A50] to-[#C48B90] p-6 sm:p-8 text-white shadow-xl shadow-[#7A3A50]/20">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-8 text-8xl">{eventConfig?.icon ?? "📅"}</div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-widest mb-3">
                <span>Prochain événement</span>
                <span className="h-px flex-1 bg-white/20" />
                <span className="font-mono">J-{daysUntil}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold">
                {eventConfig?.icon} {nextEvent.title}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/80">
                <span>📅 {new Date(firstDate).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}</span>
                {nextEvent.location && <span>📍 {nextEvent.location}</span>}
                <span>👥 {nextEvent._count.guests} invités</span>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href={`/events/${nextEvent._id}/guests`}
                  className="rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium hover:bg-white/30 transition"
                >
                  👥 Gérer les invités
                </Link>
                <Link
                  href={`/events/${nextEvent._id}/edit`}
                  className="rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium hover:bg-white/30 transition"
                >
                  ✏️ Éditer
                </Link>
                <Link
                  href={`/${nextEvent.slug}`}
                  target="_blank"
                  className="rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium hover:bg-white/30 transition"
                >
                  👁️ Prévisualiser →
                </Link>
                <Link
                  href={`/events/${nextEvent._id}`}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#7A3A50] hover:bg-white/90 transition"
                >
                  Ouvrir le dashboard →
                </Link>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Événements", value: totalEvents, icon: "📅", color: "from-[#7A3A50]/10 to-[#7A3A50]/5 dark:from-[#7A3A50]/20 dark:to-[#7A3A50]/10" },
          { label: "Publiés", value: publishedEvents, icon: "🌐", color: "from-green-100/80 to-green-50 dark:from-green-900/30 dark:to-green-900/10" },
          { label: "Invités totaux", value: totalGuests, icon: "👥", color: "from-blue-100/80 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10" },
          { label: "Confirmés", value: confirmedGuests, icon: "✅", color: "from-amber-100/80 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10" },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl bg-gradient-to-br ${stat.color} p-5 shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{stat.icon}</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Two-column: Events + RSVPs */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Events List — 3 cols */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Mes événements
            </h2>
            <Link
              href="/events"
              className="text-sm font-medium text-[#7A3A50] dark:text-[#C48B90] hover:underline"
            >
              Voir tout →
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
              <span className="text-4xl">📭</span>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Aucun événement</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Créez votre premier événement pour commencer
              </p>
              <Link
                href="/onboarding"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#7A3A50] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Créer un événement
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 5).map((event) => {
                const eventConfig = EVENT_TYPES[event.type as EventType];
                const firstDate = event.dates[0] ?? 0;
                const daysUntil = Math.ceil((firstDate - now) / (1000 * 60 * 60 * 24));

                return (
                  <Link
                    key={event._id}
                    href={`/events/${event._id}`}
                    className="group flex items-center gap-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm transition-all hover:border-[#7A3A50]/20 hover:shadow-md"
                  >
                    <span className="text-2xl">{eventConfig?.icon ?? "📅"}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#7A3A50] dark:group-hover:text-[#C48B90] transition truncate">
                        {event.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {new Date(firstDate).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })} · {event._count.guests} invités
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {daysUntil > 0 && daysUntil <= 30 && (
                        <span className="rounded-lg bg-[#7A3A50]/5 dark:bg-[#7A3A50]/20 px-2.5 py-1 text-[11px] font-semibold text-[#7A3A50] dark:text-[#C48B90]">
                          J-{daysUntil}
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColor[event.status as EventStatus]}`}>
                        {statusLabel[event.status as EventStatus]}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent RSVPs — 2 cols */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Dernières confirmations
          </h2>
          {recentRSVPs.length === 0 ? (
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center shadow-sm">
              <span className="text-3xl">📭</span>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Aucune confirmation</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm divide-y divide-gray-50 dark:divide-gray-800">
              {recentRSVPs.map((rsvp) => (
                <Link
                  key={rsvp._id}
                  href={`/events/${rsvp.guest.event.id}/guests`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        rsvp.presence ? "bg-green-500" : "bg-red-400"
                      }`}
                    />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">
                        {rsvp.guest.firstName} {rsvp.guest.lastName}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate block">
                        {rsvp.guest.event.title}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-2">
                    {rsvp.presence
                      ? `✅ ${rsvp.adultCount}A`
                      : "❌"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
