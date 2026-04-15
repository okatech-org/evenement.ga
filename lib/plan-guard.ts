import { PLAN_LIMITS } from "@/lib/config";
import type { Plan, ModuleType } from "@/lib/types";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export type PlanCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; currentPlan: string; requiredPlan?: string };

/**
 * Vérifie si l'utilisateur peut créer un nouvel événement.
 * Prend un email pour résoudre l'utilisateur (compatible JWT legacy).
 */
export async function checkEventLimit(
  email: string,
  plan: Plan
): Promise<PlanCheckResult> {
  const limits = PLAN_LIMITS[plan];
  if (limits.maxEvents === Infinity) {
    return { allowed: true };
  }

  const currentCount = await convexClient.query(api.events.countByEmail, {
    email,
  });

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
 * Vérifie si l'événement peut accueillir un nouvel invité.
 */
export async function checkGuestLimit(
  eventId: string,
  plan: Plan
): Promise<PlanCheckResult> {
  const limits = PLAN_LIMITS[plan];
  if (limits.maxGuests === Infinity) {
    return { allowed: true };
  }

  const currentCount = await convexClient.query(api.events.countGuestsByEvent, {
    eventId: eventId as Id<"events">,
  });

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
 * Vérifie si le module est accessible avec le plan actuel.
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
