import { MODULE_TYPES, PLAN_LIMITS } from "@/lib/config";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Modules — Super Admin" };

export default function SuperAdminModulesPage() {
  const modules = Object.entries(MODULE_TYPES);
  const plans = Object.entries(PLAN_LIMITS);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Catalogue des Modules</h1>
        <p className="mt-1 text-sm text-[#8B949E]">
          {modules.length} modules disponibles dans la plateforme
        </p>
      </div>

      {/* Module cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(([key, mod]) => (
          <div
            key={key}
            className="rounded-xl border border-[#30363D] bg-[#161B22] p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{mod.icon}</span>
              <div>
                <h3 className="text-sm font-bold text-white">{mod.label}</h3>
                <p className="text-[10px] font-mono text-[#484F58]">{key}</p>
              </div>
            </div>
            <p className="text-xs text-[#8B949E] leading-relaxed mb-4">
              {mod.description}
            </p>

            {/* Plan availability */}
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-[#484F58]">
                Disponible sur
              </p>
              <div className="flex flex-wrap gap-1.5">
                {plans.map(([planKey, planConfig]) => {
                  const modules = planConfig.modules || [];
                  const available = typeof modules === "string"
                    ? modules === "all"
                    : (modules as string[]).includes(key);
                  return (
                    <span
                      key={planKey}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        available
                          ? planKey === "FREE"
                            ? "bg-gray-500/20 text-gray-300"
                            : planKey === "ESSENTIEL"
                              ? "bg-blue-500/20 text-blue-400"
                              : planKey === "PREMIUM"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-purple-500/20 text-purple-400"
                          : "bg-[#21262D] text-[#484F58] line-through"
                      }`}
                    >
                      {planKey}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
