import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * FlatCard — Conteneur de base (charte §5.1).
 * Fond citizen-surface-card, bordure subtile, radius xl.
 */
export const FlatCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl bg-citizen-surface-card border border-citizen-border overflow-hidden",
      className
    )}
    {...props}
  />
));
FlatCard.displayName = "FlatCard";

export const FlatCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 md:p-5", className)} {...props} />
));
FlatCardContent.displayName = "FlatCardContent";
