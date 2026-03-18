import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import { ConfigForm } from "./config-form";

export const metadata: Metadata = { title: "Configuration — Super Admin" };

export default async function SuperAdminConfigPage() {
  const config = await prisma.globalConfig.findUnique({
    where: { id: "global" },
  });

  const configData = config
    ? {
        maintenanceMode: config.maintenanceMode,
        newRegistrations: config.newRegistrations,
        demoEnabled: config.demoEnabled,
        maintenanceMessage: config.maintenanceMessage,
      }
    : {
        maintenanceMode: false,
        newRegistrations: true,
        demoEnabled: true,
        maintenanceMessage: null,
      };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Configuration Système
        </h1>
        <p className="mt-1 text-sm text-[#8B949E]">
          Paramètres globaux de la plateforme
        </p>
      </div>

      <ConfigForm config={configData} />
    </div>
  );
}
