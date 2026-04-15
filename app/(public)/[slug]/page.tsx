import { notFound } from "next/navigation";
import { THEME_PRESETS } from "@/lib/themes/presets";
import { getGoogleFontsUrl, generateThemeCSS } from "@/lib/themes/presets";
import { EVENT_TYPES } from "@/lib/config";
import type { EventType } from "@/lib/types";
import { InvitationCard } from "@/components/public/invitation-card";
import type { Metadata } from "next";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const event = await convexClient.query(api.events.getBySlug, {
    slug: params.slug,
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
  // Migré Prisma → Convex : query unifiée getPublicBySlug
  const event = await convexClient.query(api.events.getPublicBySlug, {
    slug: params.slug,
    inviteToken: searchParams.guest,
  });

  if (!event) notFound();

  // Parse JSON strings stockés (Convex)
  const parseJson = <T = Record<string, unknown>>(s: string | undefined): T => {
    if (!s) return {} as T;
    try {
      return JSON.parse(s) as T;
    } catch {
      return {} as T;
    }
  };

  // Build theme from Convex or use preset
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

  const getModuleConfig = (type: string): Record<string, unknown> | null => {
    const mod = event.modules.find((m) => m.type === type);
    if (!mod?.configJson) return null;
    return parseJson(mod.configJson);
  };

  const modulesData = {
    programme: getModuleConfig("MOD_PROGRAMME"),
    menu: getModuleConfig("MOD_MENU"),
    logistics: getModuleConfig("MOD_LOGISTIQUE"),
    chat: getModuleConfig("MOD_CHAT"),
    gallery: getModuleConfig("MOD_GALERIE"),
    rsvp: getModuleConfig("MOD_RSVP"),
  };

  // Chat : resolve replies (map replyToId → original message)
  const messageMap = new Map(event.chatMessages.map((m) => [m._id, m]));
  const chatMessages = event.chatMessages.map((m) => {
    const original = m.replyToId ? messageMap.get(m.replyToId) : null;
    return {
      id: m._id,
      senderName: m.senderName || "Anonyme",
      senderRole: m.senderRole || "GUEST",
      text: m.content,
      reactions: parseJson<Record<string, string[]>>(m.reactions),
      replyTo: original
        ? {
            id: original._id,
            senderName: original.senderName || "Anonyme",
            content: original.content,
          }
        : null,
      sentAt: new Date(m._creationTime).toISOString(),
    };
  });

  // Convex event.dates[0] = date principale (Prisma.date)
  const firstDate = event.dates[0] ?? Date.now();

  // Reshape guestInfo pour matcher l'ancienne forme Prisma (pas de _id)
  const guestInfo = event.guestInfo
    ? {
        firstName: event.guestInfo.firstName,
        lastName: event.guestInfo.lastName,
        email: event.guestInfo.email,
        inviteToken: event.guestInfo.inviteToken,
        hasRsvp: event.guestInfo.hasRsvp,
        presence: event.guestInfo.presence,
        qrToken: event.guestInfo.qrToken,
      }
    : null;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link href={fontsUrl} rel="stylesheet" />

      <InvitationCard
        event={{
          id: event._id,
          slug: event.slug,
          title: event.title,
          type: event.type,
          date: new Date(firstDate).toISOString(),
          location: event.location ?? null,
          description: event.description ?? null,
          organizer: event.user.name,
          guestCount: event._count.guests,
          coverImage: event.coverImage ?? null,
          coverVideo: event.coverVideo ?? null,
        }}
        theme={{
          cssVars,
          fontDisplay: themeData.fontDisplay,
          fontBody: themeData.fontBody,
          entryEffect,
          ambientEffect,
          ambientIntensity,
          scrollReveal,
          pageMedia: parseJson(event.theme?.pageMedia),
          pageThemes: parseJson(event.theme?.pageThemes),
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
