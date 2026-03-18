"use client";

import { useState } from "react";
import { THEME_PRESETS } from "@/lib/themes/presets";
import { ENTRY_EFFECTS, AMBIENT_EFFECTS } from "@/lib/config";

interface ThemeEditorProps {
  eventId: string;
  currentTheme: {
    preset: string;
    colorPrimary?: string | null;
    colorSecondary?: string | null;
    colorAccent?: string | null;
    colorBackground?: string | null;
    colorText?: string | null;
    colorSurface?: string | null;
    colorMuted?: string | null;
    colorBorder?: string | null;
    fontDisplay?: string | null;
    fontBody?: string | null;
    entryEffect?: string | null;
    ambientEffect?: string | null;
    ambientIntensity?: number | null;
    scrollReveal?: string | null;
    cursorEffect?: string | null;
    fontSizeTitle?: string | null;
    fontSizeBody?: string | null;
    letterSpacing?: string | null;
    lineHeight?: string | null;
  };
  eventType: string;
}

type TabId = "preset" | "colors" | "fonts" | "typography" | "effects";

const FONT_SIZES = [
  { value: "sm", label: "Petit" },
  { value: "base", label: "Normal" },
  { value: "lg", label: "Grand" },
  { value: "xl", label: "XL" },
  { value: "2xl", label: "2XL" },
  { value: "3xl", label: "3XL" },
  { value: "4xl", label: "4XL" },
];

const LETTER_SPACINGS = [
  { value: "tighter", label: "Très serré" },
  { value: "tight", label: "Serré" },
  { value: "normal", label: "Normal" },
  { value: "wide", label: "Large" },
  { value: "wider", label: "Plus large" },
  { value: "widest", label: "Très large" },
];

const LINE_HEIGHTS = [
  { value: "tight", label: "Serré (1.25)" },
  { value: "snug", label: "Compact (1.375)" },
  { value: "normal", label: "Normal (1.5)" },
  { value: "relaxed", label: "Aéré (1.625)" },
  { value: "loose", label: "Espacé (2)" },
];

export function ThemeEditor({ eventId, currentTheme }: ThemeEditorProps) {
  const [activeTab, setActiveTab] = useState<TabId>("preset");
  const [theme, setTheme] = useState(currentTheme);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveTheme(updates: Partial<typeof theme>) {
    setIsSaving(true);
    setSaved(false);
    const newTheme = { ...theme, ...updates };
    setTheme(newTheme);

    try {
      await fetch(`/api/events/${eventId}/theme`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTheme),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save theme:", error);
    } finally {
      setIsSaving(false);
    }
  }

  function applyPreset(presetId: string) {
    const preset = THEME_PRESETS[presetId];
    if (!preset) return;
    saveTheme({
      preset: presetId,
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
      entryEffect: preset.entryEffect,
      ambientEffect: preset.ambientEffect,
      ambientIntensity: preset.ambientIntensity,
      scrollReveal: preset.scrollReveal,
      cursorEffect: preset.cursorEffect,
    });
  }

  const tabs = [
    { id: "preset" as const, label: "Presets", icon: "🎨" },
    { id: "colors" as const, label: "Couleurs", icon: "🖌️" },
    { id: "fonts" as const, label: "Polices", icon: "🔤" },
    { id: "typography" as const, label: "Typo", icon: "📐" },
    { id: "effects" as const, label: "Effets", icon: "✨" },
  ];

  return (
    <div className="space-y-6">
      {/* Save indicator */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-[#7A3A50] text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 whitespace-nowrap">
          {isSaving ? "Sauvegarde..." : saved ? "✅ Sauvegardé" : ""}
        </span>
      </div>

      {/* Preset Tab */}
      {activeTab === "preset" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(THEME_PRESETS).map(([id, preset]) => (
            <button
              key={id}
              onClick={() => applyPreset(id)}
              className={`group rounded-xl border p-4 text-left transition hover:shadow-md ${
                theme.preset === id
                  ? "border-[#7A3A50] ring-2 ring-[#7A3A50]/20"
                  : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
              }`}
            >
              {/* Color preview */}
              <div className="flex gap-1.5 mb-3">
                {[preset.colorPrimary, preset.colorSecondary, preset.colorAccent, preset.colorBackground].map((c, i) => (
                  <div
                    key={i}
                    className="h-6 w-6 rounded-full border border-gray-200 dark:border-gray-700"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">{preset.label}</h4>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {preset.fontDisplay} + {preset.fontBody}
              </p>
              {theme.preset === id && (
                <span className="mt-2 inline-block rounded-full bg-[#7A3A50]/10 px-2.5 py-0.5 text-xs font-medium text-[#7A3A50] dark:text-[#C48B90]">
                  Actif
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Colors Tab */}
      {activeTab === "colors" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Palette de couleurs</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { key: "colorPrimary", label: "Primaire", desc: "Couleur principale de l'invitation" },
                { key: "colorSecondary", label: "Secondaire", desc: "Éléments d'accompagnement" },
                { key: "colorAccent", label: "Accent", desc: "Boutons et liens importants" },
                { key: "colorBackground", label: "Fond", desc: "Arrière-plan principal" },
                { key: "colorText", label: "Texte", desc: "Titres et paragraphes" },
                { key: "colorSurface", label: "Surface", desc: "Cartes et sections" },
                { key: "colorMuted", label: "Gris", desc: "Texte secondaire" },
                { key: "colorBorder", label: "Bordure", desc: "Séparateurs et cadres" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center gap-3">
                  <input
                    type="color"
                    value={(theme as Record<string, string | null | number | undefined>)[key] as string || "#000000"}
                    onChange={(e) => saveTheme({ [key]: e.target.value })}
                    className="h-10 w-10 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div
            className="rounded-xl border p-8"
            style={{
              backgroundColor: theme.colorBackground || "#FFF",
              color: theme.colorText || "#000",
              borderColor: theme.colorBorder || "#E5E7EB",
            }}
          >
            <h3
              className="text-xl font-bold"
              style={{ color: theme.colorPrimary || "#000" }}
            >
              Aperçu en direct
            </h3>
            <p className="mt-2 text-sm" style={{ color: theme.colorMuted || "#666" }}>
              Voici à quoi ressemblera votre invitation avec ces couleurs.
            </p>
            <div
              className="mt-4 inline-block rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: theme.colorAccent || "#C9A96E" }}
            >
              Confirmer ma présence
            </div>
          </div>
        </div>
      )}

      {/* Fonts Tab */}
      {activeTab === "fonts" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Polices de caractères</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Police d&apos;affichage (titres)
                </label>
                <select
                  value={theme.fontDisplay || "Cormorant Garamond"}
                  onChange={(e) => saveTheme({ fontDisplay: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  {[
                    "Cormorant Garamond", "Playfair Display", "Libre Baskerville",
                    "Nunito", "Inter", "Raleway", "Poppins", "Lora",
                    "Merriweather", "Crimson Text",
                  ].map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Police du corps (texte)
                </label>
                <select
                  value={theme.fontBody || "Montserrat"}
                  onChange={(e) => saveTheme({ fontBody: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  {[
                    "Montserrat", "Poppins", "Source Sans Pro", "Open Sans",
                    "Inter", "Lato", "Roboto", "Nunito Sans",
                  ].map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Typography Tab (NEW) */}
      {activeTab === "typography" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              📐 Personnalisation typographique
            </h3>
            <div className="space-y-5">
              {/* Title Size */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Taille des titres
                </label>
                <div className="flex flex-wrap gap-2">
                  {FONT_SIZES.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => saveTheme({ fontSizeTitle: size.value })}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        (theme.fontSizeTitle || "2xl") === size.value
                          ? "border-[#7A3A50] bg-[#7A3A50]/10 text-[#7A3A50] dark:text-[#C48B90]"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Size */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Taille du texte
                </label>
                <div className="flex flex-wrap gap-2">
                  {FONT_SIZES.slice(0, 5).map((size) => (
                    <button
                      key={size.value}
                      onClick={() => saveTheme({ fontSizeBody: size.value })}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        (theme.fontSizeBody || "base") === size.value
                          ? "border-[#7A3A50] bg-[#7A3A50]/10 text-[#7A3A50] dark:text-[#C48B90]"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Letter Spacing */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Espacement des lettres
                </label>
                <div className="flex flex-wrap gap-2">
                  {LETTER_SPACINGS.map((sp) => (
                    <button
                      key={sp.value}
                      onClick={() => saveTheme({ letterSpacing: sp.value })}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        (theme.letterSpacing || "normal") === sp.value
                          ? "border-[#7A3A50] bg-[#7A3A50]/10 text-[#7A3A50] dark:text-[#C48B90]"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Height */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Hauteur de ligne
                </label>
                <div className="flex flex-wrap gap-2">
                  {LINE_HEIGHTS.map((lh) => (
                    <button
                      key={lh.value}
                      onClick={() => saveTheme({ lineHeight: lh.value })}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        (theme.lineHeight || "normal") === lh.value
                          ? "border-[#7A3A50] bg-[#7A3A50]/10 text-[#7A3A50] dark:text-[#C48B90]"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {lh.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Typography Preview */}
          <div
            className="rounded-xl border p-8 space-y-4"
            style={{
              backgroundColor: theme.colorBackground || "#FFF",
              color: theme.colorText || "#000",
              borderColor: theme.colorBorder || "#E5E7EB",
              fontFamily: theme.fontBody || "Montserrat",
            }}
          >
            <h3
              className="font-bold"
              style={{
                fontFamily: theme.fontDisplay || "Cormorant Garamond",
                fontSize: { sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem" }[theme.fontSizeTitle || "2xl"],
                color: theme.colorPrimary || "#000",
                letterSpacing: { tighter: "-0.05em", tight: "-0.025em", normal: "0", wide: "0.025em", wider: "0.05em", widest: "0.1em" }[theme.letterSpacing || "normal"],
              }}
            >
              Aperçu du titre
            </h3>
            <p
              style={{
                fontSize: { sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem" }[theme.fontSizeBody || "base"],
                lineHeight: { tight: "1.25", snug: "1.375", normal: "1.5", relaxed: "1.625", loose: "2" }[theme.lineHeight || "normal"],
                color: theme.colorMuted || "#666",
              }}
            >
              Voici un exemple de texte pour votre invitation. Vous pouvez ajuster la taille, l&apos;espacement et la hauteur de ligne pour obtenir le rendu parfait.
            </p>
          </div>
        </div>
      )}

      {/* Effects Tab */}
      {activeTab === "effects" && (
        <div className="space-y-4">
          {/* Entry Effect */}
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Effet d&apos;entrée</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              L&apos;animation jouée lors de l&apos;ouverture de l&apos;invitation
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(ENTRY_EFFECTS).map(([id, effect]) => (
                <button
                  key={id}
                  onClick={() => saveTheme({ entryEffect: id })}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                    theme.entryEffect === id
                      ? "border-[#7A3A50] bg-[#7A3A50]/5 dark:bg-[#7A3A50]/20"
                      : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                  }`}
                >
                  <span className="text-lg">🎬</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{effect.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{effect.weight}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Ambient Effect */}
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Effet ambiant</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Particules et animations de fond
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => saveTheme({ ambientEffect: null })}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                  !theme.ambientEffect
                    ? "border-[#7A3A50] bg-[#7A3A50]/5 dark:bg-[#7A3A50]/20"
                    : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                }`}
              >
                <span className="text-lg">🚫</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Aucun</p>
              </button>
              {Object.entries(AMBIENT_EFFECTS).map(([id, effect]) => (
                <button
                  key={id}
                  onClick={() => saveTheme({ ambientEffect: id })}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                    theme.ambientEffect === id
                      ? "border-[#7A3A50] bg-[#7A3A50]/5 dark:bg-[#7A3A50]/20"
                      : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                  }`}
                >
                  <span className="text-lg">✨</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{effect.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{effect.weight}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Intensity slider */}
            {theme.ambientEffect && (
              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Intensité : {Math.round((theme.ambientIntensity ?? 0.5) * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={theme.ambientIntensity ?? 0.5}
                  onChange={(e) => saveTheme({ ambientIntensity: parseFloat(e.target.value) })}
                  className="w-full accent-[#7A3A50]"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
