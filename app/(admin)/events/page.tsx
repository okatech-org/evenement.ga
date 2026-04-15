import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EVENT_TYPES } from "@/lib/config";
import type { EventType, EventStatus } from "@/lib/types";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Migré Prisma → Convex : utilise getDashboardData qui retourne déjà
  // events enrichis avec theme, modules actifs, guest count.
  const data = await convexClient.query(api.events.getDashboardData, {
    userId: session.user.id as Id<"users">,
  });
  const events = data.events;

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

  const now = Date.now();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mes événements</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {events.length} événement{events.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 rounded-xl bg-[#7A3A50] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7A3A50]/25 transition hover:bg-[#6A2A40]"
        >
          <span className="text-lg">+</span> Nouvel événement
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-16 text-center">
          <span className="text-5xl">📅</span>
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Aucun événement
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Commencez par créer votre premier événement
          </p>
          <Link
            href="/onboarding"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#7A3A50] px-6 py-3 text-sm font-semibold text-white"
          >
            Créer un événement
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const config = EVENT_TYPES[event.type as EventType];
            const firstDate = event.dates[0] ?? 0;
            const daysUntil = Math.ceil((firstDate - now) / (1000 * 60 * 60 * 24));
            const isPast = daysUntil <= 0;

            return (
              <div
                key={event._id}
                className="group relative rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all hover:border-[#7A3A50]/20 hover:shadow-lg overflow-hidden"
              >
                {/* Top accent bar */}
                <div
                  className="h-1"
                  style={{
                    background: event.status === "PUBLISHED"
                      ? "linear-gradient(90deg, #7A3A50, #C48B90)"
                      : event.status === "DRAFT"
                      ? "linear-gradient(90deg, #EAB308, #FDE68A)"
                      : "#9CA3AF",
                  }}
                />

                <Link href={`/events/${event._id}`} className="block p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{config?.icon ?? "📅"}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#7A3A50] dark:group-hover:text-[#C48B90] transition">
                          {event.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {config?.label ?? event.type}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColor[event.status as EventStatus]}`}>
                      {statusLabel[event.status as EventStatus]}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>📅 {new Date(firstDate).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}</span>
                    <span>👥 {event._count.guests}</span>
                    <span>📦 {event.modules.length}</span>
                  </div>

                  {!isPast && daysUntil > 0 && (
                    <div className="mt-3 rounded-lg bg-[#7A3A50]/5 dark:bg-[#7A3A50]/15 px-3 py-1.5 text-xs font-semibold text-[#7A3A50] dark:text-[#C48B90] text-center">
                      {daysUntil <= 1 ? "🎉 C'est demain !" : `Dans ${daysUntil} jours`}
                    </div>
                  )}
                </Link>

                {/* Quick action footer */}
                <div className="flex border-t border-gray-50 dark:border-gray-800 divide-x divide-gray-50 dark:divide-gray-800">
                  <Link
                    href={`/events/${event._id}/guests`}
                    className="flex-1 py-2.5 text-center text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-[#7A3A50] dark:hover:text-[#C48B90] transition"
                  >
                    👥 Invités
                  </Link>
                  <Link
                    href={`/events/${event._id}/edit`}
                    className="flex-1 py-2.5 text-center text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-[#7A3A50] dark:hover:text-[#C48B90] transition"
                  >
                    ✏️ Éditer
                  </Link>
                  <Link
                    href={`/${event.slug}`}
                    target="_blank"
                    className="flex-1 py-2.5 text-center text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-[#7A3A50] dark:hover:text-[#C48B90] transition"
                  >
                    👁️ Voir
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
