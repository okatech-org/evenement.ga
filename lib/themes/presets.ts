import { EventType } from "@/lib/types";

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

// ─── Palette "Cité de la Démocratie" ─────────────────────────
// Tous les presets partagent la même palette Or + crème.
// Seuls les effets (entry/ambient/scroll/cursor) varient pour garder
// un peu de personnalité visuelle par type d'événement.
const CHARTE_COLORS = {
  colorPrimary: "#88734C",      // Or institutionnel
  colorSecondary: "#b59e5e",    // Or clair
  colorAccent: "#88734C",       // Or (pas de vert/jaune/bleu)
  colorBackground: "#F2F2EB",   // Crème charte
  colorText: "#202e44",         // Navy charte
  colorSurface: "#FFFFFF",      // Card
  colorMuted: "#6B6B6B",        // Slate neutre
  colorBorder: "#E8E4DB",       // Subtil (cohérent avec citizen-border)
  fontDisplay: "Geist",
  fontBody: "Geist",
} as const;

export const THEME_PRESETS: Record<string, ThemePreset> = {
  mariage: {
    id: "mariage",
    label: "Romance & Élégance",
    eventType: "MARIAGE",
    ...CHARTE_COLORS,
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
    ...CHARTE_COLORS,
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
    ...CHARTE_COLORS,
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
    ...CHARTE_COLORS,
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
    ...CHARTE_COLORS,
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
    ...CHARTE_COLORS,
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
