import { convexClient } from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import { DEMO_ACCOUNTS } from "@/lib/demo-guard";
import { EVENT_TYPES, MODULE_TYPES } from "@/lib/config";
import { DemoClientSection } from "./demo-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Démo en direct — EventFlow",
  description:
    "Explorez EventFlow sans créer de compte. Testez de vraies pages d'invitation, connectez-vous sur un compte de démonstration.",
};

interface DemoEvent {
  slug: string;
  title: string;
  type: string;
  date: string;
  location: string | null;
  description: string | null;
  totalGuests: number;
  confirmed: number;
  declined: number;
  rsvpRate: number;
  activeModules: string[];
}

async function getDemoEvents(): Promise<DemoEvent[]> {
  try {
    // Get all events, then filter demo ones
    // We'll use the events that have demo-related slugs
    const demoSlugs = [
      "mariage-ray-et-ashly-2026",
      "demo-mariage-sophie-marc",
      "demo-anniversaire-50ans-kone",
      "demo-deuil-famille-mbeki",
      "demo-conference-techsummit-2026",
      "demo-bapteme-eden-traore",
    ];

    const results: DemoEvent[] = [];

    for (const slug of demoSlugs) {
      const event = await convexClient.query(api.events.getBySlug, { slug });
      if (!event || event.status !== "PUBLISHED") continue;

      // Get guests for this event
      const guests = await convexClient.query(api.rsvp.listGuests, {
        eventId: event._id,
      });

      // Get modules for this event
      const modules = await convexClient.query(api.modules.listByEvent, {
        eventId: event._id,
      });

      const totalGuests = guests.length;
      const confirmed = guests.filter((g: { status: string }) => g.status === "CONFIRMED").length;
      const declined = guests.filter((g: { status: string }) => g.status === "DECLINED").length;
      const rsvpRate =
        totalGuests > 0
          ? Math.round(((confirmed + declined) / totalGuests) * 100)
          : 0;

      results.push({
        slug: event.slug,
        title: event.title,
        type: event.type,
        date: new Date(event.dates[0]).toISOString(),
        location: event.location ?? null,
        description: event.description ?? null,
        totalGuests,
        confirmed,
        declined,
        rsvpRate,
        activeModules: modules.filter((m: { active: boolean }) => m.active).map((m: { type: string }) => m.type),
      });
    }

    // Sort: vitrine event first
    return results.sort((a, b) => {
      if (a.slug === "mariage-ray-et-ashly-2026") return -1;
      if (b.slug === "mariage-ray-et-ashly-2026") return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  } catch (error) {
    console.error("[Demo Page] Error fetching events:", error);
    return [];
  }
}

export default async function DemoPage() {
  const events = await getDemoEvents();

  const eventTypesConfig = EVENT_TYPES;
  const moduleTypesConfig = MODULE_TYPES;

  // Prepare serializable data for client component
  const accountsArray = Object.entries(DEMO_ACCOUNTS)
    .filter(([key]) => key !== "superadmin")
    .map(([key, val]) => ({
      key,
      ...val,
      plan: val.plan as string,
      role: val.role as string,
    }));

  const eventsData = events.map((e) => ({
    ...e,
    typeConfig: eventTypesConfig[e.type as keyof typeof eventTypesConfig],
    moduleIcons: e.activeModules
      .slice(0, 4)
      .map((m) => ({
        type: m,
        icon: moduleTypesConfig[m as keyof typeof moduleTypesConfig]?.icon || "📦",
        label: moduleTypesConfig[m as keyof typeof moduleTypesConfig]?.label || m,
      })),
    extraModules: Math.max(0, e.activeModules.length - 4),
  }));

  return <DemoClientSection events={eventsData} accounts={accountsArray} />;
}
