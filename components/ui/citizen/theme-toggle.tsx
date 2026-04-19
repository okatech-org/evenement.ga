"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

/**
 * ThemeToggle — Bouton Light/Dark (charte §5.9).
 * Utilise le ThemeProvider custom existant (class-based, 2 valeurs : light|dark).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  function toggle() {
    toggleTheme();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      className={cn(
        "h-8 w-8 rounded-full bg-transparent border border-gold/20 text-gold hover:bg-gold/10 transition flex items-center justify-center",
        className
      )}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
