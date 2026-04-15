import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { EVENT_TYPES } from "@/lib/config";
import { THEME_PRESETS } from "@/lib/themes/presets";
import type { EventType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export default async function OGImage({
  params,
}: {
  params: { slug: string };
}) {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    include: { theme: true },
  });

  const baseStyles = {
    notFound: {
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#1a1a1a",
      color: "#fff",
      fontSize: 48,
      fontFamily: "sans-serif",
    } as React.CSSProperties,
    icon: { fontSize: 64, marginBottom: 16 } as React.CSSProperties,
  };

  if (!event) {
    return new ImageResponse(
      (
        <div {...{ style: baseStyles.notFound }}>
          Événement non trouvé
        </div>
      ),
      { ...size }
    );
  }

  const presetId = event.theme?.preset || "mariage";
  const preset = THEME_PRESETS[presetId] || THEME_PRESETS.mariage;
  const eventConfig = EVENT_TYPES[event.type as EventType];

  const bg = event.theme?.colorBackground || preset.colorBackground;
  const primary = event.theme?.colorPrimary || preset.colorPrimary;
  const muted = event.theme?.colorMuted || preset.colorMuted;
  const accent = event.theme?.colorAccent || preset.colorAccent;

  const dateStr = event.date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const dynamicStyles = {
    container: {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: bg,
      padding: 60,
      fontFamily: "sans-serif",
    } as React.CSSProperties,
    title: {
      fontSize: 56,
      fontWeight: 700,
      color: primary,
      textAlign: "center",
      lineHeight: 1.2,
      maxWidth: "80%",
    } as React.CSSProperties,
    dateLoc: {
      marginTop: 24,
      fontSize: 24,
      color: muted,
      display: "flex",
      alignItems: "center",
      gap: 16,
    } as React.CSSProperties,
    cta: {
      marginTop: 40,
      padding: "12px 32px",
      backgroundColor: accent,
      borderRadius: 12,
      color: "#fff",
      fontSize: 20,
      fontWeight: 600,
    } as React.CSSProperties,
    branding: {
      position: "absolute",
      bottom: 24,
      right: 40,
      fontSize: 14,
      color: muted,
      opacity: 0.5,
    } as React.CSSProperties,
  };

  return new ImageResponse(
    (
      <div {...{ style: dynamicStyles.container }}>
        {/* Event icon */}
        <div {...{ style: baseStyles.icon }}>
          {eventConfig?.icon || "📅"}
        </div>

        {/* Title */}
        <div {...{ style: dynamicStyles.title }}>
          {event.title}
        </div>

        {/* Date & Location */}
        <div {...{ style: dynamicStyles.dateLoc }}>
          <span>📅 {dateStr}</span>
          {event.location && <span>📍 {event.location}</span>}
        </div>

        {/* CTA */}
        <div {...{ style: dynamicStyles.cta }}>
          Voir l&apos;invitation
        </div>

        {/* Branding */}
        <div {...{ style: dynamicStyles.branding }}>
          evenement.ga
        </div>
      </div>
    ),
    { ...size }
  );
}
