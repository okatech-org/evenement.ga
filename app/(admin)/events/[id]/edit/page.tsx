import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { THEME_PRESETS, generateThemeCSS } from "@/lib/themes/presets";
import { EventEditClient } from "@/components/admin/event-edit-client";
// Import depuis le fichier utils (sans "use client") — safe en server component.
import { venueFromConvex } from "@/components/admin/venue-utils";
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

  // Charte "Cité de la Démocratie" — palette forcée pour l'aperçu admin aussi.
  // Les valeurs event.theme.* en DB (héritées des anciens presets) sont ignorées pour
  // refléter exactement ce que l'invité public voit.
  const presetId = event.theme?.preset || "mariage";
  const preset = THEME_PRESETS[presetId] || THEME_PRESETS.mariage;

  const themeColors = {
    colorPrimary: preset.colorPrimary,
    colorSecondary: preset.colorSecondary,
    colorAccent: preset.colorAccent,
    colorBackground: preset.colorBackground,
    colorText: preset.colorText,
    colorSurface: preset.colorSurface,
    colorMuted: preset.colorMuted,
    colorBorder: preset.colorBorder,
    fontDisplay: preset.fontDisplay,
    fontBody: preset.fontBody,
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
    // Effets visuels : conservés depuis le preset (variété par type d'event)
    entryEffect: preset.entryEffect,
    ambientEffect: preset.ambientEffect,
    ambientIntensity: preset.ambientIntensity,
    scrollReveal: preset.scrollReveal,
    // Médias par page conservés (uploads utilisateur)
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

  // Dates ISO complètes pour l'éditeur multi-jour
  const allDatesIso = event.dates.map((d) => new Date(d).toISOString());

  // Venues — convertis en draft strings pour le formulaire
  const venuesDraft = (event.venues || []).map(venueFromConvex);

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
        dates: allDatesIso,
        location: event.location ?? null,
        coverImage: event.coverImage ?? null,
        coverVideo: event.coverVideo ?? null,
        rsvpDeadline: (event as { rsvpDeadline?: number }).rsvpDeadline ?? null,
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
        venues: venuesDraft,
      }}
      theme={themeData}
    />
    </Suspense>
  );
}
