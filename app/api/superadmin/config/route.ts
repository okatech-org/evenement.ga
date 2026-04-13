export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logSystem } from "@/lib/superadmin/logger";

export async function PUT(req: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const updated = await prisma.globalConfig.upsert({
      where: { id: "global" },
      update: {
        maintenanceMode: body.maintenanceMode ?? false,
        newRegistrations: body.newRegistrations ?? true,
        demoEnabled: body.demoEnabled ?? true,
        maintenanceMessage: body.maintenanceMessage ?? null,
        updatedBy: session.user.id,
      },
      create: {
        id: "global",
        maintenanceMode: body.maintenanceMode ?? false,
        newRegistrations: body.newRegistrations ?? true,
        demoEnabled: body.demoEnabled ?? true,
        maintenanceMessage: body.maintenanceMessage ?? null,
        updatedBy: session.user.id,
      },
    });

    await logSystem("INFO", "ADMIN", "CONFIG_UPDATED", {
      actorId: session.user.id,
      metadata: {
        maintenanceMode: updated.maintenanceMode,
        newRegistrations: updated.newRegistrations,
        demoEnabled: updated.demoEnabled,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Config API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la mise à jour." },
      { status: 500 }
    );
  }
}
