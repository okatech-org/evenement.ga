import { prisma } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Utilisateurs — Super Admin" };

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

export default async function SuperAdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; plan?: string; role?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const pageSize = 25;
  const skip = (page - 1) * pageSize;

  // Build filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (params.plan) where.plan = params.plan;
  if (params.role) where.role = params.role;
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { email: { contains: params.q, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        _count: {
          select: { events: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
          <p className="mt-1 text-sm text-[#8B949E]">
            {total} utilisateurs au total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form className="flex flex-wrap gap-3" method="GET">
          <input
            name="q"
            type="text"
            placeholder="Rechercher par nom ou email..."
            defaultValue={params.q || ""}
            className="rounded-lg border border-[#30363D] bg-[#0F1117] px-4 py-2 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:border-[#C48B90] focus:outline-none w-64"
          />
          <select
            name="plan"
            defaultValue={params.plan || ""}
            className="rounded-lg border border-[#30363D] bg-[#0F1117] px-3 py-2 text-sm text-[#E6EDF3] focus:border-[#C48B90] focus:outline-none"
          >
            <option value="">Tous les plans</option>
            <option value="FREE">Free</option>
            <option value="ESSENTIEL">Essentiel</option>
            <option value="PREMIUM">Premium</option>
            <option value="ENTREPRISE">Entreprise</option>
          </select>
          <select
            name="role"
            defaultValue={params.role || ""}
            className="rounded-lg border border-[#30363D] bg-[#0F1117] px-3 py-2 text-sm text-[#E6EDF3] focus:border-[#C48B90] focus:outline-none"
          >
            <option value="">Tous les rôles</option>
            <option value="ORGANIZER">Organizer</option>
            <option value="CO_ORGANIZER">Co-Organizer</option>
            <option value="MODERATOR">Moderator</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-[#21262D] px-4 py-2 text-sm font-medium text-[#E6EDF3] hover:bg-[#30363D]"
          >
            Filtrer
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#30363D] bg-[#161B22]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#30363D] text-left text-xs uppercase tracking-wider text-[#8B949E]">
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Événements</th>
              <th className="px-4 py-3">Inscrit le</th>
              <th className="px-4 py-3">Démo</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262D]">
            {users.map((user) => (
              <tr
                key={user.id}
                className="transition-colors hover:bg-[#21262D]/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#21262D] text-xs font-bold text-[#8B949E]">
                      {user.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-medium text-[#E6EDF3]">
                        {user.name || "—"}
                      </p>
                      <p className="text-xs text-[#484F58]">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ROLE_COLORS[user.role] || ""}`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${PLAN_COLORS[user.plan] || ""}`}
                  >
                    {user.plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#8B949E]">
                  {user._count.events}
                </td>
                <td className="px-4 py-3 text-xs text-[#8B949E]">
                  {user.createdAt.toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3">
                  {user.isDemoAccount && (
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                      DÉMO
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/superadmin/users/${user.id}`}
                    className="text-xs text-[#C48B90] hover:underline"
                  >
                    Voir →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#8B949E]">
            Page {page} sur {totalPages} · {total} résultats
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/superadmin/users?page=${page - 1}${params.plan ? `&plan=${params.plan}` : ""}${params.role ? `&role=${params.role}` : ""}${params.q ? `&q=${params.q}` : ""}`}
                className="rounded-lg border border-[#30363D] bg-[#21262D] px-3 py-1.5 text-sm text-[#8B949E] hover:text-white"
              >
                ← Précédent
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/superadmin/users?page=${page + 1}${params.plan ? `&plan=${params.plan}` : ""}${params.role ? `&role=${params.role}` : ""}${params.q ? `&q=${params.q}` : ""}`}
                className="rounded-lg border border-[#30363D] bg-[#21262D] px-3 py-1.5 text-sm text-[#8B949E] hover:text-white"
              >
                Suivant →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
