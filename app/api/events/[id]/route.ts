import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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
    const { title, description, date, location, visibility, password, coverImage, coverVideo } = body;

    const updated = await prisma.event.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(location !== undefined && { location }),
        ...(visibility !== undefined && { visibility }),
        ...(password !== undefined && { password }),
        ...(coverImage !== undefined && { coverImage }),
        ...(coverVideo !== undefined && { coverVideo }),
      },
      include: { theme: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
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

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Type de fichier non supporté" }, { status: 400 });
    }

    // Limit file size (10MB images, 50MB videos)
    const maxSize = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${isImage ? "10" : "50"}MB)` },
        { status: 400 }
      );
    }

    // Save file
    const ext = file.name.split(".").pop() || (isImage ? "jpg" : "mp4");
    const filename = `${type || (isImage ? "cover" : "video")}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "events", params.id);

    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(path.join(uploadDir, filename), buffer);

    const url = `/uploads/events/${params.id}/${filename}`;

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
