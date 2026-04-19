import * as React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  /** Couleur persona : classes tailwind comme "bg-persona-organizer" */
  personaBg?: string;
  /** Couleur texte icône : classes tailwind comme "text-persona-organizer" */
  personaText?: string;
}

/**
 * StatCard — Métrique inline (charte §5.3).
 * Icône ronde persona + label + valeur, en ligne.
 */
export function StatCard({
  icon,
  label,
  value,
  personaBg = "bg-primary/10",
  personaText = "text-primary",
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg bg-citizen-surface-nested border border-citizen-border",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            personaBg,
            personaText
          )}
        >
          {icon}
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      <span className="text-sm font-black tabular-nums">{value}</span>
    </div>
  );
}
