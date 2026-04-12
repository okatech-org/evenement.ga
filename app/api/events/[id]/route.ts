import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EventUpdateSchema } from "@/lib/validations";
import { z } from "zod";
import {
  uploadFile,
  FILE_LIMITS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
} from "@/lib/storage";

/**
 * PUT /api/events/[id] — Update event details
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
  _request: Request,
  { params }: { params: { id: string } }
) {
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
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
  }
}
