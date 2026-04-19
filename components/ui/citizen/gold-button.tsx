import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const goldButtonStyles = cva(
  "inline-flex items-center justify-center font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        // Charte §8.1 — CTA Or principal
        primary:
          "bg-gold hover:bg-gold-dark text-white rounded-full shadow-gold hover:shadow-gold-lg hover:scale-[1.02] active:scale-[0.98]",
        // Charte §8.2 — Glass CTA (immersion)
        glass:
          "bg-gold/20 backdrop-blur-xl border-2 border-gold/50 text-white rounded-full shadow-gold font-black uppercase tracking-widest",
        // Charte §8.3 — Login style (or clair sur fond noir)
        login:
          "bg-gold-light hover:bg-gold text-black font-bold rounded-xl shadow-gold-login hover:shadow-gold active:scale-[0.98]",
        // Outline subtil
        outline:
          "border border-gold/30 text-gold hover:bg-gold/10 rounded-full",
        ghost:
          "text-gold hover:bg-gold/10 rounded-full",
      },
      size: {
        sm: "text-xs px-3 py-1.5",
        md: "text-sm px-6 py-2.5",
        lg: "text-sm px-8 py-3",
        xl: "text-base px-10 py-4",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface GoldButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof goldButtonStyles> {
  asChild?: boolean;
}

/**
 * GoldButton — CTA primaire or (charte §8).
 * 5 variantes : primary (par défaut), glass, login, outline, ghost.
 */
export const GoldButton = React.forwardRef<HTMLButtonElement, GoldButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(goldButtonStyles({ variant, size }), className)}
      {...props}
    />
  )
);
GoldButton.displayName = "GoldButton";
