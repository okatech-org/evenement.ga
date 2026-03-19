import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { THEME_PRESETS } from "@/lib/themes/presets";
import { generateThemeCSS } from "@/lib/themes/presets";
import { EventEditClient } from "@/components/admin/event-edit-client";

export default async function EventEditPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const event = await prisma.event.findUnique({
    where: { id: params.id, userId: session.user.id },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      date: true,
      endDate: true,
      location: true,
      coverImage: true,
      coverVideo: true,
      type: true,
      user: { select: { name: true } },
      _count: { select: { guests: true } },
      theme: true,
      modules: {
        orderBy: { order: "asc" },
      },
    },
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

  const themeData = {
    cssVars,
    fontDisplay: themeColors.fontDisplay,
    fontBody: themeColors.fontBody,
    entryEffect: event.theme?.entryEffect || preset.entryEffect,
    ambientEffect: event.theme?.ambientEffect ?? preset.ambientEffect,
    ambientIntensity: event.theme?.ambientIntensity ?? preset.ambientIntensity,
    scrollReveal: event.theme?.scrollReveal || preset.scrollReveal,
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

  return (
    <EventEditClient
      event={{
        ...event,
        date: event.date.toISOString(),
        endDate: event.endDate?.toISOString() || null,
        organizer: event.user.name,
        guestCount: event._count.guests,
        modules: event.modules.map((m) => ({
          id: m.id,
          type: m.type,
          active: m.active,
          order: m.order,
          configJson: m.configJson as Record<string, unknown>,
        })),
      }}
      theme={themeData}
    />
  );
}
