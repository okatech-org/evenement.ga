export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCsrf } from "@/lib/api-guards";
import { EventUpdateSchema } from "@/lib/validations";
import { z } from "zod";
import {
  uploadFile,
  FILE_LIMITS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
} from "@/lib/storage";
import { logSystem } from "@/lib/superadmin/logger";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// Magic-number validation pour verifier le contenu reel du fichier
const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xFF, 0xD8, 0xFF]],
  "image/png": [[0x89, 0x50, 0x4E, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header
  "image/gif": [[0x47, 0x49, 0x46, 0x38]],
  "video/mp4": [], // ftyp at offset 4
  "video/quicktime": [], // ftyp at offset 4
  "video/webm": [[0x1A, 0x45, 0xDF, 0xA3]],
};

function validateFileSignature(buffer: Buffer, declaredType: string): boolean {
  if (buffer.length < 12) return false;

  if (declaredType === "video/mp4" || declaredType === "video/quicktime") {
    return buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70;
  }

  if (declaredType === "image/webp") {
    const riff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const webp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return riff && webp;
  }

  const signatures = FILE_SIGNATURES[declaredType];
  if (!signatures || signatures.length === 0) return true;

  return signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}

/**
 * PUT /api/events/[id] — Update event details (migré Convex)
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const csrfError = verifyCsrf(request);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = EventUpdateSchema.parse(body);

    // Priorité : dates (multi-jour) > date (legacy scalaire)
    const resolvedDates: number[] | undefined =
      validatedData.dates !== undefined
        ? validatedData.dates.map((d) =>
            typeof d === "number" ? d : new Date(d).getTime()
          )
        : validatedData.date !== undefined
          ? [new Date(validatedData.date).getTime()]
          : undefined;

    await convexClient.mutation(api.events.update, {
      id: params.id as Id<"events">,
      email: session.user.email,
      ...(validatedData.title !== undefined && { title: validatedData.title }),
      ...(validatedData.description !== undefined && { description: validatedData.description }),
      ...(resolvedDates !== undefined && { dates: resolvedDates }),
      ...(validatedData.location !== undefined && { location: validatedData.location }),
      ...(validatedData.visibility !== undefined && { visibility: validatedData.visibility }),
      ...(validatedData.password !== undefined && { password: validatedData.password }),
      ...(validatedData.coverImage !== undefined && { coverImage: validatedData.coverImage }),
      ...(validatedData.coverVideo !== undefined && { coverVideo: validatedData.coverVideo }),
      ...(validatedData.rsvpDeadline !== undefined && { rsvpDeadline: validatedData.rsvpDeadline }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Update event error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

/**
 * DELETE /api/events/[id] — Delete an event (migré Convex, cascade inclus)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const csrfError = verifyCsrf(request);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await convexClient.query(api.events.getForAdmin, {
      id: params.id as Id<"events">,
      email: session.user.email,
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    await convexClient.mutation(api.events.remove, {
      id: params.id as Id<"events">,
      email: session.user.email,
    });

    logSystem("WARNING", "EVENT", "EVENT_DELETED", {
      actorId: session.user.id,
      targetId: params.id,
      metadata: { title: event.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete event error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

/**
 * POST /api/events/[id] — Upload cover image/video (migré Convex)
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const csrfError = verifyCsrf(request);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await convexClient.query(api.events.getForAdmin, {
      id: params.id as Id<"events">,
      email: session.user.email,
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Type de fichier non supporté" }, { status: 400 });
    }

    const maxSize = isImage ? FILE_LIMITS.image : FILE_LIMITS.video;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${isImage ? "10" : "50"}MB)` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!validateFileSignature(buffer, file.type)) {
      return NextResponse.json(
        { error: "Le contenu du fichier ne correspond pas au type déclaré" },
        { status: 400 }
      );
    }
    const url = await uploadFile(buffer, {
      folder: `events/${params.id}`,
      filename: file.name,
      contentType: file.type,
    });

    // Update event with cover URL via Convex
    const isVideoFile = type === "video" || isVideo;
    await convexClient.mutation(api.events.update, {
      id: params.id as Id<"events">,
      email: session.user.email,
      ...(isVideoFile ? { coverVideo: url } : { coverImage: url }),
    });
    const field = isVideoFile ? "coverVideo" : "coverImage";

    return NextResponse.json({ success: true, url, field });
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: "Erreur lors de l'upload", details: errorMessage }, { status: 500 });
  }
}
