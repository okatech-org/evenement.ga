import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logSystem } from "@/lib/superadmin/logger";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Accès réservé aux super administrateurs." },
        { status: 403 }
      );
    }

    await logSystem("INFO", "DEMO", "DEMO_RESET_STARTED", {
      actorId: session.user.id,
    });

    // Reset demo data: delete guests, RSVPs, chat messages for demo events
    const demoEvents = await prisma.event.findMany({
      where: { slug: { startsWith: "demo-" } },
      select: { id: true, slug: true },
    });

    const eventIds = demoEvents.map((e) => e.id);

    // Delete in order (respecting foreign keys)
    const deletedChat = await prisma.chatMessage.deleteMany({
      where: { eventId: { in: eventIds } },
    });

    const deletedScans = await prisma.qRScan.deleteMany({
      where: { eventId: { in: eventIds } },
    });

    // Delete RSVPs via guests
    const demoGuests = await prisma.guest.findMany({
      where: { eventId: { in: eventIds } },
      select: { id: true },
    });
    const guestIds = demoGuests.map((g) => g.id);

    const deletedRsvps = await prisma.rSVP.deleteMany({
      where: { guestId: { in: guestIds } },
    });

    const deletedGuests = await prisma.guest.deleteMany({
      where: { eventId: { in: eventIds } },
    });

    await logSystem("INFO", "DEMO", "DEMO_RESET_COMPLETED", {
      actorId: session.user.id,
      metadata: {
        eventsReset: eventIds.length,
        deletedGuests: deletedGuests.count,
        deletedRsvps: deletedRsvps.count,
        deletedChat: deletedChat.count,
        deletedScans: deletedScans.count,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        eventsReset: eventIds.length,
        deletedGuests: deletedGuests.count,
        deletedRsvps: deletedRsvps.count,
        deletedChat: deletedChat.count,
        message:
          "Données démo réinitialisées. Relancez le seed pour recréer les données.",
      },
    });
  } catch (error) {
    console.error("[Demo Reset] Error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la réinitialisation." },
      { status: 500 }
    );
  }
}
