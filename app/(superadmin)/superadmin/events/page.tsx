import { prisma } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Événements — Super Admin" };

const EVENT_ICONS: Record<string, string> = {
  MARIAGE: "💍", ANNIVERSAIRE: "🎂", DEUIL: "🕊️",
  BAPTEME: "👶", CONFERENCE: "🎤", PRIVE: "✨",
};

export default async function SuperAdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const pageSize = 25;
  const skip = (page - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (params.type) where.type = params.type;
  if (params.status) where.status = params.status;
  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { slug: { contains: params.q, mode: "insensitive" } },
    ];
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { guests: true } },
        guests: { where: { status: "CONFIRMED" }, select: { id: true } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Événements</h1>
        <p className="mt-1 text-sm text-[#8B949E]">{total} événements au total</p>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3" method="GET">
        <input
          name="q"
          type="text"
          placeholder="Rechercher..."
          defaultValue={params.q || ""}
          className="rounded-lg border border-[#30363D] bg-[#0F1117] px-4 py-2 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:border-[#C48B90] focus:outline-none w-56"
        />
        <select
          name="type"
          defaultValue={params.type || ""}
          className="rounded-lg border border-[#30363D] bg-[#0F1117] px-3 py-2 text-sm text-[#E6EDF3]"
        >
          <option value="">Tous les types</option>
          {Object.entries(EVENT_ICONS).map(([key, icon]) => (
            <option key={key} value={key}>{icon} {key}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params.status || ""}
          className="rounded-lg border border-[#30363D] bg-[#0F1117] px-3 py-2 text-sm text-[#E6EDF3]"
        >
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button type="submit" className="rounded-lg bg-[#21262D] px-4 py-2 text-sm font-medium text-[#E6EDF3] hover:bg-[#30363D]">
          Filtrer
        </button>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#30363D] bg-[#161B22]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#30363D] text-left text-xs uppercase tracking-wider text-[#8B949E]">
              <th className="px-4 py-3">Événement</th>
              <th className="px-4 py-3">Organisateur</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Invités</th>
              <th className="px-4 py-3">RSVP%</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262D]">
            {events.map((event) => {
              const rsvpPct = event._count.guests > 0
                ? Math.round((event.guests.length / event._count.guests) * 100)
                : 0;
              return (
                <tr key={event.id} className="transition-colors hover:bg-[#21262D]/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{EVENT_ICONS[event.type] || "📌"}</span>
                      <div>
                        <p className="font-medium text-[#E6EDF3]">{event.title}</p>
                        <p className="text-xs text-[#484F58]">/{event.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#8B949E]">
                    {event.user.name || event.user.email}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#8B949E]">
                    {event.date.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      event.status === "PUBLISHED"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : event.status === "DRAFT"
                          ? "bg-gray-500/20 text-gray-400"
                          : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8B949E]">{event._count.guests}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-[#21262D]">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${rsvpPct}%` }} />
                      </div>
                      <span className="text-xs text-[#8B949E]">{rsvpPct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/${event.slug}`} target="_blank" className="text-xs text-[#C48B90] hover:underline">
                      Voir →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#8B949E]">Page {page} sur {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/superadmin/events?page=${page - 1}`} className="rounded-lg border border-[#30363D] bg-[#21262D] px-3 py-1.5 text-sm text-[#8B949E] hover:text-white">← Précédent</Link>
            )}
            {page < totalPages && (
              <Link href={`/superadmin/events?page=${page + 1}`} className="rounded-lg border border-[#30363D] bg-[#21262D] px-3 py-1.5 text-sm text-[#8B949E] hover:text-white">Suivant →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
