import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/config";
import type { Plan, ModuleType } from "@prisma/client";

export type PlanCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; currentPlan: string; requiredPlan?: string };

/**
 * Verifie si l'utilisateur peut creer un nouvel evenement
 */
export async function checkEventLimit(
  userId: string,
  plan: Plan
): Promise<PlanCheckResult> {
  const limits = PLAN_LIMITS[plan];
  if (limits.maxEvents === Infinity) {
    return { allowed: true };
  }

  const currentCount = await prisma.event.count({ where: { userId } });

  if (currentCount >= limits.maxEvents) {
    return {
      allowed: false,
      reason: `Votre plan ${limits.label} est limité à ${limits.maxEvents} événement(s). Passez au plan supérieur pour en créer davantage.`,
      currentPlan: plan,
      requiredPlan: getNextPlan(plan),
    };
  }

  return { allowed: true };
}

/**
 * Verifie si l'evenement peut accueillir un nouvel invite
 */
export async function checkGuestLimit(
  eventId: string,
  plan: Plan
): Promise<PlanCheckResult> {
  const limits = PLAN_LIMITS[plan];
  if (limits.maxGuests === Infinity) {
    return { allowed: true };
  }

  const currentCount = await prisma.guest.count({ where: { eventId } });

  if (currentCount >= limits.maxGuests) {
    return {
      allowed: false,
      reason: `Votre plan ${limits.label} est limité à ${limits.maxGuests} invités par événement. Passez au plan supérieur pour en ajouter davantage.`,
      currentPlan: plan,
      requiredPlan: getNextPlan(plan),
    };
  }

  return { allowed: true };
}

/**
 * Verifie si le module est accessible avec le plan actuel
 */
export function checkModuleAccess(
  moduleType: ModuleType,
  plan: Plan
): PlanCheckResult {
  const limits = PLAN_LIMITS[plan];

  if (limits.modules === "all") {
    return { allowed: true };
  }

  if (!limits.modules.includes(moduleType)) {
    const requiredPlan = findMinPlanForModule(moduleType);
    return {
      allowed: false,
      reason: `Le module ${moduleType} nécessite le plan ${requiredPlan ?? "supérieur"}.`,
      currentPlan: plan,
      requiredPlan: requiredPlan ?? undefined,
    };
  }

  return { allowed: true };
}

function getNextPlan(plan: Plan): string | undefined {
  const order: Plan[] = ["FREE", "ESSENTIEL", "PREMIUM", "ENTREPRISE"];
  const idx = order.indexOf(plan);
  return idx < order.length - 1 ? order[idx + 1] : undefined;
}

function findMinPlanForModule(moduleType: ModuleType): string | null {
  const order: Plan[] = ["FREE", "ESSENTIEL", "PREMIUM", "ENTREPRISE"];
  for (const plan of order) {
    const limits = PLAN_LIMITS[plan];
    if (limits.modules === "all" || limits.modules.includes(moduleType)) {
      return plan;
    }
  }
  return null;
}
