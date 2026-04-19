"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GlassCTA — Bouton immersif glass + pulsation (charte §8.2).
 * Fond Or translucide + blur, pulsation CSS (box-shadow + opacité).
 * Framer Motion évité ici pour rester léger ; l'anim est faite en CSS keyframes.
 */
export function GlassCTA({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "relative bg-gold/20 backdrop-blur-xl border-2 border-gold/50 text-white px-8 py-3 rounded-full font-black uppercase tracking-widest shadow-gold transition-all hover:bg-gold/30 hover:shadow-gold-lg active:scale-[0.98]",
        "citizen-glass-pulse",
        className
      )}
      {...props}
    >
      {children}
      <style jsx>{`
        .citizen-glass-pulse {
          animation: citizenGlassPulse 2.5s ease-in-out infinite;
        }
        @keyframes citizenGlassPulse {
          0%,
          100% {
            opacity: 0.9;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.02);
          }
        }
      `}</style>
    </button>
  );
}
