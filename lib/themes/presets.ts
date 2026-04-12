import { EventType } from "@prisma/client";

/**
 * Theme preset definitions — one per event type.
 * Each preset includes colors, fonts, entry/ambient effects,
 * and scroll reveal settings.
 */
export interface ThemePreset {
  id: string;
  label: string;
  eventType: EventType;
  // Colors
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBackground: string;
  colorText: string;
  colorSurface: string;
  colorMuted: string;
  colorBorder: string;
  // Fonts
  fontDisplay: string;
  fontBody: string;
  // Effects
  entryEffect: string;
  ambientEffect: string | null;
  ambientIntensity: number;
  scrollReveal: string;
  cursorEffect: string | null;
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  mariage: {
    id: "mariage",
    label: "Romance & Élégance",
    eventType: "MARIAGE",
    colorPrimary: "#8B5A6A",
    colorSecondary: "#C48B90",
    colorAccent: "#C9A96E",
    colorBackground: "#FFFDF9",
    colorText: "#3D2428",
    colorSurface: "#FFFFFF",
    colorMuted: "#9B8A8E",
    colorBorder: "#E8DDD5",
    fontDisplay: "Cormorant Garamond",
    fontBody: "Montserrat",
    entryEffect: "floral_draw",
    ambientEffect: "floating_petals",
    ambientIntensity: 0.6,
    scrollReveal: "stagger_lines",
    cursorEffect: "petal",
  },
  anniversaire: {
    id: "anniversaire",
    label: "Fête & Joie",
    eventType: "ANNIVERSAIRE",
    colorPrimary: "#E8734A",
    colorSecondary: "#C9A96E",
    colorAccent: "#F2C94C",
    colorBackground: "#FFFEF8",
    colorText: "#2D1810",
    colorSurface: "#FFFFFF",
    colorMuted: "#A89080",
    colorBorder: "#F0E6D8",
    fontDisplay: "Playfair Display",
    fontBody: "Poppins",
    entryEffect: "curtain_confetti",
    ambientEffect: "sparkle",
    ambientIntensity: 0.8,
    scrollReveal: "fade_up",
    cursorEffect: null,
  },
  deuil: {
    id: "deuil",
    label: "Sérénité & Recueillement",
    eventType: "DEUIL",
    colorPrimary: "#4A5568",
    colorSecondary: "#A0AEC0",
    colorAccent: "#B8943E",
    colorBackground: "#F9F8F6",
    colorText: "#1A202C",
    colorSurface: "#FFFFFF",
    colorMuted: "#A0AEC0",
    colorBorder: "#E2E8F0",
    fontDisplay: "Libre Baskerville",
    fontBody: "Source Sans Pro",
    entryEffect: "morning_mist",
    ambientEffect: null,
    ambientIntensity: 0.2,
    scrollReveal: "fade_up",
    cursorEffect: null,
  },
  bapteme: {
    id: "bapteme",
    label: "Douceur & Pureté",
    eventType: "BAPTEME",
    colorPrimary: "#93C5FD",
    colorSecondary: "#C4B5FD",
    colorAccent: "#D1D5DB",
    colorBackground: "#F8FAFF",
    colorText: "#1E3A5F",
    colorSurface: "#FFFFFF",
    colorMuted: "#94A3B8",
    colorBorder: "#E0E7FF",
    fontDisplay: "Nunito",
    fontBody: "Open Sans",
    entryEffect: "fade_white",
    ambientEffect: "bubbles",
    ambientIntensity: 0.5,
    scrollReveal: "fade_up",
    cursorEffect: null,
  },
  conference: {
    id: "conference",
    label: "Pro & Moderne",
    eventType: "CONFERENCE",
    colorPrimary: "#1E3A5F",
    colorSecondary: "#3B82F6",
    colorAccent: "#10B981",
    colorBackground: "#FFFFFF",
    colorText: "#111827",
    colorSurface: "#F9FAFB",
    colorMuted: "#6B7280",
    colorBorder: "#E5E7EB",
    fontDisplay: "Inter",
    fontBody: "Inter",
    entryEffect: "fade_fast",
    ambientEffect: "geometric_grid",
    ambientIntensity: 0.3,
    scrollReveal: "slide_left",
    cursorEffect: null,
  },
  prive: {
    id: "prive",
    label: "Luxe & Mystère",
    eventType: "PRIVE",
    colorPrimary: "#C9A96E",
    colorSecondary: "#8B7355",
    colorAccent: "#D4AF37",
    colorBackground: "#0F0F0F",
    colorText: "#F5F0E8",
    colorSurface: "#1A1A1A",
    colorMuted: "#888888",
    colorBorder: "#333333",
    fontDisplay: "Raleway",
    fontBody: "Lato",
    entryEffect: "candle_reveal",
    ambientEffect: "starlight",
    ambientIntensity: 0.4,
    scrollReveal: "fade_up",
    cursorEffect: null,
  },
};

/**
 * Get preset for an event type
 */
export function getPresetForEventType(type: EventType): ThemePreset {
  const map: Record<EventType, string> = {
    MARIAGE: "mariage",
    ANNIVERSAIRE: "anniversaire",
    DEUIL: "deuil",
    BAPTEME: "bapteme",
    CONFERENCE: "conference",
    PRIVE: "prive",
  };
  return THEME_PRESETS[map[type]] ?? THEME_PRESETS.mariage;
}

/**
 * Convert a hex color to CSS custom property values
 */
export function hexToHSL(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Generate CSS variables from a theme preset or custom theme data
 */
export function generateThemeCSS(theme: {
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBackground: string;
  colorText: string;
  colorSurface: string;
  colorMuted: string;
  colorBorder: string;
  fontDisplay: string;
  fontBody: string;
}): Record<string, string> {
  return {
    "--theme-primary": hexToHSL(theme.colorPrimary),
    "--theme-secondary": hexToHSL(theme.colorSecondary),
    "--theme-accent": hexToHSL(theme.colorAccent),
    "--theme-background": hexToHSL(theme.colorBackground),
    "--theme-text": hexToHSL(theme.colorText),
    "--theme-surface": hexToHSL(theme.colorSurface),
    "--theme-muted": hexToHSL(theme.colorMuted),
    "--theme-border": hexToHSL(theme.colorBorder),
    "--font-display": theme.fontDisplay,
    "--font-body": theme.fontBody,
    // Raw hex values for direct CSS usage
    "--color-primary": theme.colorPrimary,
    "--color-secondary": theme.colorSecondary,
    "--color-accent": theme.colorAccent,
    "--color-background": theme.colorBackground,
    "--color-text": theme.colorText,
    "--color-surface": theme.colorSurface,
    "--color-muted": theme.colorMuted,
    "--color-border": theme.colorBorder,
  };
}

/**
 * Google Fonts import URL for preset fonts
 */
export function getGoogleFontsUrl(fontDisplay: string, fontBody: string): string {
  const fonts = new Set([fontDisplay, fontBody]);
  const params = Array.from(fonts)
    .map((f) => `family=${f.replace(/ /g, "+")}:wght@300;400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
