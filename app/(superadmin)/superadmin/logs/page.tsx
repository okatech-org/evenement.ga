import { prisma } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Logs Système — Super Admin" };

const LEVEL_COLORS: Record<string, string> = {
  INFO: "bg-blue-500/20 text-blue-400",
  WARNING: "bg-amber-500/20 text-amber-400",
  ERROR: "bg-red-500/20 text-red-400",
  CRITICAL: "bg-red-600/30 text-red-300",
};

export default async function SuperAdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const pageSize = 50;
  const skip = (page - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (params.level) where.level = params.level;
  if (params.category) where.category = params.category;

  const [logs, total] = await Promise.all([
    prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.systemLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Logs Système</h1>
        <p className="mt-1 text-sm text-[#8B949E]">{total} entrées</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["", "INFO", "WARNING", "ERROR", "CRITICAL"].map((lvl) => (
          <Link
            key={lvl}
            href={`/superadmin/logs${lvl ? `?level=${lvl}` : ""}${params.category ? `&category=${params.category}` : ""}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              (params.level || "") === lvl
                ? "bg-[#C48B90]/20 text-[#C48B90]"
                : "bg-[#21262D] text-[#8B949E] hover:text-white"
            }`}
          >
            {lvl || "Tous"}
          </Link>
        ))}
      </div>

      {/* Log entries */}
      <div className="space-y-1">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-3 rounded-lg border border-[#30363D]/50 bg-[#161B22] px-4 py-3 hover:bg-[#21262D]/50 transition-colors"
          >
            {/* Level badge */}
            <span
              className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${LEVEL_COLORS[log.level] || ""}`}
            >
              {log.level}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded bg-[#21262D] px-1.5 py-0.5 text-[10px] font-mono text-[#484F58]">
                  {log.category}
                </span>
                <span className="text-sm text-[#E6EDF3]">{log.action}</span>
              </div>
              {log.actorId && (
                <p className="mt-0.5 text-xs text-[#484F58]">
                  Actor: {log.actorId}
                </p>
              )}
              {log.ipAddress && (
                <p className="text-xs text-[#484F58]">
                  IP: {log.ipAddress}
                </p>
              )}
            </div>

            {/* Timestamp */}
            <span className="shrink-0 text-xs tabular-nums text-[#484F58]">
              {log.createdAt.toLocaleString("fr-FR")}
            </span>
          </div>
        ))}

        {logs.length === 0 && (
          <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-12 text-center">
            <p className="text-sm text-[#484F58]">Aucun log trouvé.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#8B949E]">Page {page} sur {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/superadmin/logs?page=${page - 1}${params.level ? `&level=${params.level}` : ""}`} className="rounded-lg border border-[#30363D] bg-[#21262D] px-3 py-1.5 text-sm text-[#8B949E]">← Précédent</Link>
            )}
            {page < totalPages && (
              <Link href={`/superadmin/logs?page=${page + 1}${params.level ? `&level=${params.level}` : ""}`} className="rounded-lg border border-[#30363D] bg-[#21262D] px-3 py-1.5 text-sm text-[#8B949E]">Suivant →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
