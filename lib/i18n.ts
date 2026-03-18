"use client";

import { createContext, useContext } from "react";
import { fr, type Dictionary } from "./dictionaries/fr";
import { en } from "./dictionaries/en";

export type Locale = "fr" | "en";

export const LOCALES: Record<Locale, { label: string; flag: string }> = {
  fr: { label: "Français", flag: "🇫🇷" },
  en: { label: "English", flag: "🇬🇧" },
};

const dictionaries: Record<Locale, Dictionary> = { fr, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.fr;
}

// ─── Context ─────────────────────────────────────────

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
}

export const I18nContext = createContext<I18nContextType>({
  locale: "fr",
  setLocale: () => {},
  t: fr,
});

export function useI18n() {
  return useContext(I18nContext);
}
