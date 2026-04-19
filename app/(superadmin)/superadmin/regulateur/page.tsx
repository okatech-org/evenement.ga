import { prisma } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Modération — Super Admin" };

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-400",
  IN_PROGRESS: "bg-blue-500/20 text-blue-400",
  RESOLVED: "bg-emerald-500/20 text-emerald-400",
  DISMISSED: "bg-gray-500/20 text-gray-400",
};

export default async function SuperAdminReportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (params.status) where.status = params.status;

  const [reports, counts] = await Promise.all([
    prisma.abuseReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.abuseReport.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  const countMap: Record<string, number> = {};
  counts.forEach((c) => { countMap[c.status] = c._count; });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Modération</h1>
        <p className="mt-1 text-sm text-[#8B949E]">
          Signalements et contenus signalés
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {["", "PENDING", "IN_PROGRESS", "RESOLVED", "DISMISSED"].map((s) => (
          <Link
            key={s}
            href={`/superadmin/regulateur${s ? `?status=${s}` : ""}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              (params.status || "") === s
                ? "bg-[#b59e5e]/20 text-[#b59e5e]"
                : "bg-[#21262D] text-[#8B949E] hover:text-white"
            }`}
          >
            {s || "Tous"} {s ? `(${countMap[s] || 0})` : ""}
          </Link>
        ))}
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-12 text-center">
          <span className="text-4xl">✅</span>
          <p className="mt-3 text-sm text-[#8B949E]">
            Aucun signalement {params.status ? `avec le statut ${params.status}` : ""}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border border-[#30363D] bg-[#161B22] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[report.status]}`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-[#484F58]">
                      {report.createdAt.toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <p className="text-sm text-[#E6EDF3]">{report.reason}</p>
                  <p className="mt-1 text-xs text-[#484F58]">
                    Type: {report.targetType} · ID: {report.targetId}
                  </p>
                  <p className="mt-1 text-xs text-[#484F58]">
                    Signalé par: {report.reportedBy}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
