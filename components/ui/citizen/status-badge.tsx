import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeStyles = cva(
  "inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide",
  {
    variants: {
      variant: {
        success:
          "bg-gray-100 dark:bg-gray-800 text-emerald-600 dark:text-emerald-400",
        warning:
          "bg-gray-100 dark:bg-gray-800 text-amber-600 dark:text-amber-400",
        danger: "bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400",
        neutral: "bg-gray-100 dark:bg-gray-800 text-gray-500",
        info: "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeStyles> {}

/**
 * StatusBadge — Indicateur d'état (charte §5.5).
 * Fond neutre `gray-100/800`, couleur uniquement dans le texte.
 */
export function StatusBadge({
  className,
  variant,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeStyles({ variant }), className)}
      {...props}
    />
  );
}
