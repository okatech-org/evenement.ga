import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { THEME_PRESETS } from "@/lib/themes/presets";
import { getGoogleFontsUrl, generateThemeCSS } from "@/lib/themes/presets";
import { EVENT_TYPES } from "@/lib/config";
import type { EventType, Prisma } from "@prisma/client";
import { InvitationCard } from "@/components/public/invitation-card";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    select: { title: true, description: true, type: true, date: true },
  });

  if (!event) return { title: "Événement non trouvé" };

  const eventConfig = EVENT_TYPES[event.type as EventType];

  return {
    title: event.title,
    description: event.description || `Vous êtes invité(e) — ${eventConfig?.label}`,
    openGraph: {
      title: event.title,
      description: event.description || `Vous êtes invité(e) — ${eventConfig?.label}`,
      type: "website",
    },
  };
}

export default async function PublicEventPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { guest?: string };
}) {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    include: {
      theme: true,
      modules: {
        where: { active: true },
        orderBy: { order: "asc" },
      },
      user: {
        select: { name: true },
      },
      chatMessages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          senderName: true,
          senderRole: true,
          reactions: true,
          replyToId: true,
          createdAt: true,
        },
      },
      _count: {
        select: { guests: true },
      },
    },
  });

  if (!event || event.status === "ARCHIVED") notFound();

  // ── Lookup guest by inviteToken (personalized link) ──
  let guestInfo: {
    firstName: string;
    lastName: string;
    email: string | null;
    inviteToken: string;
    hasRsvp: boolean;
    presence: boolean | null;
    qrToken: string | null;
  } | null = null;

  if (searchParams.guest) {
    const guest = await prisma.guest.findUnique({
      where: { inviteToken: searchParams.guest },
      include: { rsvp: true },
    });

    if (guest && guest.eventId === event.id) {
      guestInfo = {
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        inviteToken: guest.inviteToken!,
        hasRsvp: !!guest.rsvp,
        presence: guest.rsvp?.presence ?? null,
        qrToken: guest.qrToken,
      };
    }
  }

  // Build theme from DB or use preset
  const presetId = event.theme?.preset || "mariage";
  const preset = THEME_PRESETS[presetId] || THEME_PRESETS.mariage;

  const themeData = {
    colorPrimary: event.theme?.colorPrimary || preset.colorPrimary,
    colorSecondary: event.theme?.colorSecondary || preset.colorSecondary,
    colorAccent: event.theme?.colorAccent || preset.colorAccent,
    colorBackground: event.theme?.colorBackground || preset.colorBackground,
    colorText: event.theme?.colorText || preset.colorText,
    colorSurface: event.theme?.colorSurface || preset.colorSurface,
    colorMuted: event.theme?.colorMuted || preset.colorMuted,
    colorBorder: event.theme?.colorBorder || preset.colorBorder,
    fontDisplay: event.theme?.fontDisplay || preset.fontDisplay,
    fontBody: event.theme?.fontBody || preset.fontBody,
  };

  const cssVars = generateThemeCSS(themeData);
  const fontsUrl = getGoogleFontsUrl(themeData.fontDisplay, themeData.fontBody);

  const entryEffect = event.theme?.entryEffect || preset.entryEffect;
  const ambientEffect = event.theme?.ambientEffect ?? preset.ambientEffect;
  const ambientIntensity = event.theme?.ambientIntensity ?? preset.ambientIntensity;
  const scrollReveal = event.theme?.scrollReveal || preset.scrollReveal;

  // Extract module configs
  const activeModuleTypes = event.modules.map((m) => m.type);

  const getModuleConfig = (type: string): Prisma.JsonValue | null => {
    const mod = event.modules.find((m) => m.type === type);
    return mod?.configJson ?? null;
  };

  // Serialize module configs for client
  const modulesData = {
    programme: getModuleConfig("MOD_PROGRAMME") as Record<string, unknown> | null,
    menu: getModuleConfig("MOD_MENU") as Record<string, unknown> | null,
    logistics: getModuleConfig("MOD_LOGISTIQUE") as Record<string, unknown> | null,
    chat: getModuleConfig("MOD_CHAT") as Record<string, unknown> | null,
    gallery: getModuleConfig("MOD_GALERIE") as Record<string, unknown> | null,
    rsvp: getModuleConfig("MOD_RSVP") as Record<string, unknown> | null,
  };

  // Serialize chat messages with reply-to resolution
  const replyIds = event.chatMessages
    .filter((m) => m.replyToId)
    .map((m) => m.replyToId!);

  const repliedMessages = replyIds.length > 0
    ? await prisma.chatMessage.findMany({
        where: { id: { in: replyIds } },
        select: { id: true, senderName: true, content: true },
      })
    : [];

  const replyMap = new Map(repliedMessages.map((m) => [m.id, m]));

  const chatMessages = event.chatMessages.map((m) => ({
    id: m.id,
    senderName: m.senderName || "Anonyme",
    senderRole: m.senderRole || "GUEST",
    text: m.content,
    reactions: (m.reactions || {}) as Record<string, string[]>,
    replyTo: m.replyToId ? replyMap.get(m.replyToId) || null : null,
    sentAt: m.createdAt.toISOString(),
  }));

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link href={fontsUrl} rel="stylesheet" />

      <InvitationCard
        event={{
          id: event.id,
          slug: event.slug,
          title: event.title,
          type: event.type,
          date: event.date.toISOString(),
          location: event.location,
          description: event.description,
          organizer: event.user.name,
          guestCount: event._count.guests,
          coverImage: event.coverImage,
          coverVideo: event.coverVideo,
        }}
        theme={{
          cssVars,
          fontDisplay: themeData.fontDisplay,
          fontBody: themeData.fontBody,
          entryEffect,
          ambientEffect,
          ambientIntensity,
          scrollReveal,
          colors: {
            primary: themeData.colorPrimary,
            secondary: themeData.colorSecondary,
            accent: themeData.colorAccent,
            background: themeData.colorBackground,
            text: themeData.colorText,
            surface: themeData.colorSurface,
            muted: themeData.colorMuted,
            border: themeData.colorBorder,
          },
        }}
        activeModules={activeModuleTypes}
        modulesData={modulesData}
        chatMessages={chatMessages}
        guestInfo={guestInfo}
      />
    </>
  );
}
