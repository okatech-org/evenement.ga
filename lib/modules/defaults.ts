import { EventType, ModuleType } from "@prisma/client";

/**
 * Default modules configuration for each event type
 * Defines which modules are activated by default and their display order.
 */
export function getDefaultModulesForType(
  eventType: EventType
): { type: ModuleType; order: number; active: boolean }[] {
  const defaults: Record<
    EventType,
    { type: ModuleType; order: number; active: boolean }[]
  > = {
    MARIAGE: [
      { type: "MOD_INVITE", order: 1, active: true },
      { type: "MOD_RSVP", order: 2, active: true },
      { type: "MOD_MENU", order: 3, active: true },
      { type: "MOD_QR", order: 4, active: true },
      { type: "MOD_PROGRAMME", order: 5, active: true },
      { type: "MOD_CHAT", order: 6, active: true },
      { type: "MOD_GALERIE", order: 7, active: false },
      { type: "MOD_DASHBOARD", order: 8, active: true },
    ],
    ANNIVERSAIRE: [
      { type: "MOD_INVITE", order: 1, active: true },
      { type: "MOD_RSVP", order: 2, active: true },
      { type: "MOD_MENU", order: 3, active: true },
      { type: "MOD_GALERIE", order: 4, active: true },
      { type: "MOD_DASHBOARD", order: 5, active: true },
    ],
    DEUIL: [
      { type: "MOD_INVITE", order: 1, active: true },
      { type: "MOD_RSVP", order: 2, active: true },
      { type: "MOD_PROGRAMME", order: 3, active: true },
      { type: "MOD_DASHBOARD", order: 4, active: true },
    ],
    BAPTEME: [
      { type: "MOD_INVITE", order: 1, active: true },
      { type: "MOD_RSVP", order: 2, active: true },
      { type: "MOD_MENU", order: 3, active: true },
      { type: "MOD_GALERIE", order: 4, active: true },
      { type: "MOD_DASHBOARD", order: 5, active: true },
    ],
    CONFERENCE: [
      { type: "MOD_INVITE", order: 1, active: true },
      { type: "MOD_RSVP", order: 2, active: true },
      { type: "MOD_QR", order: 3, active: true },
      { type: "MOD_PROGRAMME", order: 4, active: true },
      { type: "MOD_CHAT", order: 5, active: true },
      { type: "MOD_DASHBOARD", order: 6, active: true },
    ],
    PRIVE: [
      { type: "MOD_INVITE", order: 1, active: true },
      { type: "MOD_RSVP", order: 2, active: true },
      { type: "MOD_QR", order: 3, active: true },
      { type: "MOD_DASHBOARD", order: 4, active: true },
    ],
  };

  return defaults[eventType] ?? defaults.MARIAGE;
}

/**
 * Get the default theme preset for an event type
 */
export function getDefaultPresetForType(eventType: EventType): string {
  const map: Record<EventType, string> = {
    MARIAGE: "mariage",
    ANNIVERSAIRE: "anniversaire",
    DEUIL: "deuil",
    BAPTEME: "bapteme",
    CONFERENCE: "conference",
    PRIVE: "prive",
  };
  return map[eventType] ?? "mariage";
}
