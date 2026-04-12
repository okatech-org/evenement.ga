import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// Cache de la config globale (60 secondes)
let cachedConfig: {
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  newRegistrations: boolean;
  fetchedAt: number;
} | null = null;

const CACHE_TTL = 60 * 1000; // 60 secondes

export async function getGlobalConfig() {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.fetchedAt < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const config = await prisma.globalConfig.findFirst();
    cachedConfig = {
      maintenanceMode: config?.maintenanceMode ?? false,
      maintenanceMessage: config?.maintenanceMessage ?? null,
      newRegistrations: config?.newRegistrations ?? true,
      fetchedAt: now,
    };
    return cachedConfig;
  } catch {
    // En cas d'erreur DB, retourner des valeurs par defaut
    return {
      maintenanceMode: false,
      maintenanceMessage: null,
      newRegistrations: true,
      fetchedAt: now,
    };
  }
}

/**
 * Verifie si le site est en mode maintenance.
 * Retourne une reponse 503 si oui, null sinon.
 * Exclut les routes /superadmin et /api/health.
 */
export async function checkMaintenance(request: Request): Promise<NextResponse | null> {
  const url = new URL(request.url);
  // Ne pas bloquer superadmin et health check
  if (url.pathname.startsWith("/superadmin") || url.pathname.startsWith("/api/superadmin") || url.pathname === "/api/health") {
    return null;
  }

  const config = await getGlobalConfig();
  if (config.maintenanceMode) {
    return NextResponse.json(
      {
        error: "Maintenance en cours",
        message: config.maintenanceMessage || "Le site est temporairement indisponible pour maintenance.",
      },
      { status: 503 }
    );
  }

  return null;
}

/**
 * Verifie si les nouvelles inscriptions sont autorisees.
 * Retourne une reponse 403 si non, null sinon.
 */
export async function checkRegistrationAllowed(): Promise<NextResponse | null> {
  const config = await getGlobalConfig();
  if (!config.newRegistrations) {
    return NextResponse.json(
      { error: "Les inscriptions sont temporairement fermées." },
      { status: 403 }
    );
  }
  return null;
}
