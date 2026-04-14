export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

  // MP4/MOV: "ftyp" at bytes 4-7
  if (declaredType === "video/mp4" || declaredType === "video/quicktime") {
    return buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70;
  }

  // WebP: RIFF at 0-3, then WEBP at 8-11
  if (declaredType === "image/webp") {
    const riff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const webp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return riff && webp;
  }

  const signatures = FILE_SIGNATURES[declaredType];
  if (!signatures || signatures.length === 0) return true; // Type inconnu, accepter

  return signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}

/**
 * PUT /api/events/[id] — Update event details
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const csrfError = verifyCsrf(request);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id, userId: session.user.id },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = EventUpdateSchema.parse(body);

    const updated = await prisma.event.update({
      where: { id: params.id },
      data: {
        ...(validatedData.title !== undefined && { title: validatedData.title }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.date !== undefined && { date: new Date(validatedData.date) }),
        ...(validatedData.location !== undefined && { location: validatedData.location }),
        ...(validatedData.visibility !== undefined && { visibility: validatedData.visibility }),
        ...(validatedData.password !== undefined && { password: validatedData.password }),
        ...(validatedData.coverImage !== undefined && { coverImage: validatedData.coverImage }),
        ...(validatedData.coverVideo !== undefined && { coverVideo: validatedData.coverVideo }),
      },
      include: { theme: true },
    });

    return NextResponse.json({ success: true, data: updated });
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
 * DELETE /api/events/[id] — Delete an event
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const csrfError = verifyCsrf(request);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id, userId: session.user.id },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    await prisma.event.delete({ where: { id: params.id } });

    logSystem("WARNING", "EVENT", "EVENT_DELETED", { actorId: session.user.id, targetId: params.id, metadata: { title: event.title } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete event error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

/**
 * POST /api/events/[id] — Upload cover image/video
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const csrfError = verifyCsrf(request);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id, userId: session.user.id },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "image" or "video"

    if (!file) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    // Valider le type de fichier
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Type de fichier non supporté" }, { status: 400 });
    }

    // Limiter la taille
    const maxSize = isImage ? FILE_LIMITS.image : FILE_LIMITS.video;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${isImage ? "10" : "50"}MB)` },
        { status: 400 }
      );
    }

    // Upload vers S3/R2 ou local
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Valider le contenu reel du fichier via magic numbers
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

    // Update event
    const field = (type === "video" || isVideo) ? "coverVideo" : "coverImage";
    await prisma.event.update({
      where: { id: params.id },
      data: { [field]: url },
    });

    return NextResponse.json({ success: true, url, field });
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ error: "Erreur lors de l'upload", details: errorMessage, stack: errorStack }, { status: 500 });
  }
}
