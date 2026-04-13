export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { ChatMessageSchema } from "@/lib/validations";
import { z } from "zod";

/**
 * GET /api/events/[id]/chat — Fetch chat messages (public, no auth)
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { eventId: params.id, channel: "public" },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        id: true,
        content: true,
        senderName: true,
        senderRole: true,
        replyToId: true,
        reactions: true,
        createdAt: true,
      },
    });

    // Resolve reply-to references
    const replyIds = messages
      .filter((m) => m.replyToId)
      .map((m) => m.replyToId!);

    const repliedMessages = replyIds.length > 0
      ? await prisma.chatMessage.findMany({
          where: { id: { in: replyIds } },
          select: { id: true, senderName: true, content: true },
        })
      : [];

    const replyMap = new Map(repliedMessages.map((m) => [m.id, m]));

    const data = messages.map((m) => ({
      id: m.id,
      senderName: m.senderName || "Anonyme",
      senderRole: m.senderRole || "GUEST",
      text: m.content,
      reactions: m.reactions || {},
      replyTo: m.replyToId ? replyMap.get(m.replyToId) || null : null,
      sentAt: m.createdAt.toISOString(),
    }));

    // Guest count approximation: unique senders in last 24h
    const recentSenders = await prisma.chatMessage.findMany({
      where: {
        eventId: params.id,
        channel: "public",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { senderName: true },
      distinct: ["senderName"],
    });

    return NextResponse.json({
      success: true,
      data,
      meta: {
        totalMessages: messages.length,
        activeSenders: recentSenders.length,
      },
    });
  } catch (error) {
    console.error("Chat fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[id]/chat — Send a new message
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Rate limiting: 20 messages par IP par 5 minutes
  const ip = getClientIp(request);
  const rl = await rateLimit(`chat:${ip}`, 20, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Trop de messages. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { senderName, text, replyToId } = ChatMessageSchema.parse(body);

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Événement non trouvé" },
        { status: 404 }
      );
    }

    // Check if this is the organizer (authenticated)
    let senderRole = "GUEST";
    let userId: string | null = null;
    try {
      const session = await auth();
      if (session?.user?.id === event.userId) {
        senderRole = "ORGANIZER";
        userId = session.user.id;
      }
    } catch {
      // Not authenticated — that's fine for guests
    }

    const message = await prisma.chatMessage.create({
      data: {
        eventId: params.id,
        userId,
        content: text.trim(),
        senderName: senderName.trim(),
        senderRole,
        channel: "public",
        replyToId: replyToId || null,
      },
      select: {
        id: true,
        content: true,
        senderName: true,
        senderRole: true,
        replyToId: true,
        reactions: true,
        createdAt: true,
      },
    });

    // Get reply-to if exists
    let replyTo = null;
    if (message.replyToId) {
      const original = await prisma.chatMessage.findUnique({
        where: { id: message.replyToId },
        select: { id: true, senderName: true, content: true },
      });
      replyTo = original;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: message.id,
        senderName: message.senderName,
        senderRole: message.senderRole,
        text: message.content,
        reactions: message.reactions || {},
        replyTo,
        sentAt: message.createdAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Chat send error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[id]/chat — Toggle a reaction on a message
 * Body: { messageId, emoji, senderName }
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { messageId, emoji, senderName } = body;

    if (!messageId || !emoji || !senderName) {
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 }
      );
    }

    const message = await prisma.chatMessage.findFirst({
      where: { id: messageId, eventId: params.id },
      select: { id: true, reactions: true },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message non trouvé" },
        { status: 404 }
      );
    }

    // Toggle reaction
    const reactions = (message.reactions as Record<string, string[]>) || {};
    const emojiReactors = reactions[emoji] || [];

    if (emojiReactors.includes(senderName)) {
      // Remove reaction
      reactions[emoji] = emojiReactors.filter((n) => n !== senderName);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      // Add reaction
      reactions[emoji] = [...emojiReactors, senderName];
    }

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { reactions },
    });

    return NextResponse.json({ success: true, data: { reactions } });
  } catch (error) {
    console.error("Reaction error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
