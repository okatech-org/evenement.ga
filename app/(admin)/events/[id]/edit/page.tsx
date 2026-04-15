import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { THEME_PRESETS, generateThemeCSS } from "@/lib/themes/presets";
import { EventEditClient } from "@/components/admin/event-edit-client";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  // Migré Prisma → Convex : getById retourne l'event brut
  const event = await convexClient.query(api.events.getById, {
    id: params.id as Id<"events">,
  });
  return {
    title: event ? `${event.title} — Modifier | EventFlow` : "Modifier l'événement | EventFlow",
  };
}

export default async function EventEditPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const event = await convexClient.query(api.events.getForAdmin, {
    id: params.id as Id<"events">,
    email: session.user.email,
  });

  if (!event) notFound();

  // Build theme data (same logic as the public [slug] page)
  const presetId = event.theme?.preset || "mariage";
  const preset = THEME_PRESETS[presetId] || THEME_PRESETS.mariage;

  const themeColors = {
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

  const cssVars = generateThemeCSS(themeColors);

  // Convex stocke pageMedia/pageThemes comme JSON strings, on les parse.
  const parseJson = (s: string | undefined): Record<string, unknown> => {
    if (!s) return {};
    try {
      return JSON.parse(s);
    } catch {
      return {};
    }
  };

  const themeData = {
    cssVars,
    fontDisplay: themeColors.fontDisplay,
    fontBody: themeColors.fontBody,
    entryEffect: event.theme?.entryEffect || preset.entryEffect,
    ambientEffect: event.theme?.ambientEffect ?? preset.ambientEffect,
    ambientIntensity: event.theme?.ambientIntensity ?? preset.ambientIntensity,
    scrollReveal: event.theme?.scrollReveal || preset.scrollReveal,
    pageMedia: parseJson(event.theme?.pageMedia),
    pageThemes: parseJson(event.theme?.pageThemes),
    colors: {
      primary: themeColors.colorPrimary,
      secondary: themeColors.colorSecondary,
      accent: themeColors.colorAccent,
      background: themeColors.colorBackground,
      text: themeColors.colorText,
      surface: themeColors.colorSurface,
      muted: themeColors.colorMuted,
      border: themeColors.colorBorder,
    },
  };

  // Convex : dates est un array. Prisma : date + endDate singuliers.
  // On reconstruit pour compat : date = dates[0], endDate = last ou null.
  const firstDate = event.dates[0] ?? 0;
  const lastDate = event.dates[event.dates.length - 1] ?? firstDate;

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-gray-600 rounded-full" /></div>}>
    <EventEditClient
      event={{
        id: event._id,
        title: event.title,
        slug: event.slug,
        description: event.description ?? null,
        date: new Date(firstDate).toISOString(),
        endDate: event.dates.length > 1 ? new Date(lastDate).toISOString() : null,
        location: event.location ?? null,
        coverImage: event.coverImage ?? null,
        coverVideo: event.coverVideo ?? null,
        type: event.type,
        organizer: event.user.name,
        guestCount: event._count.guests,
        modules: event.modules.map((m) => ({
          id: m._id,
          type: m.type,
          active: m.active,
          order: m.order,
          configJson: (m.configJson ? JSON.parse(m.configJson) : {}) as Record<string, unknown>,
        })),
      }}
      theme={themeData}
    />
    </Suspense>
  );
}
