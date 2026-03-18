import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Get all demo events with guest counts
    const demoEvents = await prisma.event.findMany({
      where: {
        slug: {
          startsWith: "demo-",
        },
        status: "PUBLISHED",
      },
      include: {
        guests: {
          select: {
            status: true,
          },
        },
        modules: {
          where: { active: true },
          select: { type: true },
        },
      },
      orderBy: { date: "asc" },
    });

    const stats = demoEvents.map((event) => {
      const totalGuests = event.guests.length;
      const confirmed = event.guests.filter(
        (g) => g.status === "CONFIRMED"
      ).length;
      const declined = event.guests.filter(
        (g) => g.status === "DECLINED"
      ).length;
      const pending = event.guests.filter(
        (g) => g.status === "INVITED" || g.status === "SEEN"
      ).length;
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
        pending,
        rsvpRate,
        activeModules: event.modules.map((m) => m.type),
      };
    });

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("[Demo Stats] Error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
