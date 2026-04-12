import { PLAN_LIMITS } from "@/lib/config";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Plans & Limites — Super Admin" };

const PLAN_STYLES: Record<string, { gradient: string; border: string }> = {
  FREE: { gradient: "from-gray-600/20 to-gray-700/10", border: "border-gray-600/30" },
  ESSENTIEL: { gradient: "from-blue-600/20 to-blue-700/10", border: "border-blue-600/30" },
  PREMIUM: { gradient: "from-amber-600/20 to-amber-700/10", border: "border-amber-600/30" },
  ENTREPRISE: { gradient: "from-purple-600/20 to-purple-700/10", border: "border-purple-600/30" },
};

export default async function SuperAdminPlansPage() {
  const planDist = await prisma.user.groupBy({
    by: ["plan"],
    _count: true,
  });

  const planMap: Record<string, number> = {};
  planDist.forEach((p) => { planMap[p.plan] = p._count; });

  const plans = Object.entries(PLAN_LIMITS);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Plans & Limites</h1>
        <p className="mt-1 text-sm text-[#8B949E]">
          Configuration des plans et répartition des utilisateurs
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map(([key, config]) => {
          const style = PLAN_STYLES[key] || PLAN_STYLES.FREE;
          const userCount = planMap[key] || 0;
          const modulesList = config.modules === "all"
            ? ["Tous les modules"]
            : config.modules;

          return (
            <div
              key={key}
              className={`rounded-xl border ${style.border} bg-gradient-to-b ${style.gradient} p-6`}
            >
              {/* Header */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">{config.label}</h3>
                <p className="text-sm text-[#8B949E]">
                  {config.price === null ? "Sur devis" : config.price === 0 ? "Gratuit" : `${config.price.toLocaleString("fr-FR")} FCFA/an`}
                </p>
                <p className="mt-1 text-xs text-[#C48B90] font-medium">
                  {userCount} utilisateur{userCount !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Limits */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#8B949E]">Événements max</span>
                  <span className="font-medium text-[#E6EDF3]">
                    {config.maxEvents === Infinity ? "∞" : config.maxEvents}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B949E]">Invités / event</span>
                  <span className="font-medium text-[#E6EDF3]">
                    {config.maxGuests === Infinity ? "∞" : config.maxGuests}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B949E]">QR Code</span>
                  <span className="font-medium text-[#E6EDF3]">
                    {config.qrCode ? "✅" : "❌"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B949E]">Chat</span>
                  <span className="font-medium text-[#E6EDF3]">
                    {config.chat ? "✅" : "❌"}
                  </span>
                </div>
              </div>

              {/* Module list */}
              <div className="mt-4 pt-3 border-t border-white/5">
                <p className="text-[10px] uppercase tracking-wider text-[#484F58] mb-2">
                  Modules inclus
                </p>
                <div className="flex flex-wrap gap-1">
                  {modulesList.map((mod: string) => (
                    <span
                      key={mod}
                      className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-[#8B949E]"
                    >
                      {mod.replace("MOD_", "")}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
