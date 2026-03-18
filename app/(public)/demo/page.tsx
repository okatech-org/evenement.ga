import { prisma } from "@/lib/db";
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
  date: Date;
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
    const events = await prisma.event.findMany({
      where: {
        OR: [
          { slug: { startsWith: "demo-" } },
          { slug: "mariage-ray-et-ashly-2026" },
        ],
        status: "PUBLISHED",
      },
      include: {
        guests: { select: { status: true } },
        modules: { where: { active: true }, select: { type: true } },
      },
      orderBy: { date: "asc" },
    });

    // Sort: vitrine event first, then by date
    const sorted = events.sort((a, b) => {
      if (a.slug === "mariage-ray-et-ashly-2026") return -1;
      if (b.slug === "mariage-ray-et-ashly-2026") return 1;
      return a.date.getTime() - b.date.getTime();
    });

    return sorted.map((event) => {
      const totalGuests = event.guests.length;
      const confirmed = event.guests.filter((g) => g.status === "CONFIRMED").length;
      const declined = event.guests.filter((g) => g.status === "DECLINED").length;
      const rsvpRate =
        totalGuests > 0
          ? Math.round(((confirmed + declined) / totalGuests) * 100)
          : 0;

      return {
        slug: event.slug,
        title: event.title,
        type: event.type,
        date: event.date,
        location: event.location,
        description: event.description,
        totalGuests,
        confirmed,
        declined,
        rsvpRate,
        activeModules: event.modules.map((m) => m.type),
      };
    });
  } catch {
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
    date: e.date.toISOString(),
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
