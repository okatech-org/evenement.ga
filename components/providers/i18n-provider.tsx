"use client";

import { useState, useEffect, type ReactNode } from "react";
import { I18nContext, getDictionary, type Locale } from "@/lib/i18n";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("ef-locale") as Locale | null;
    if (stored && (stored === "fr" || stored === "en")) {
      setLocaleState(stored);
    }
    setMounted(true);
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem("ef-locale", l);
  }

  const t = getDictionary(mounted ? locale : "fr");

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}
