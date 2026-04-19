import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * SectionHeader — En-tête de section (charte §5.4).
 * Icône + titre à gauche, actions slot à droite.
 */
export function SectionHeader({
  title,
  icon,
  actions,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between mb-2 lg:mb-3",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {icon && (
          <span className="rounded-md p-1 bg-[#EBE6DC] dark:bg-[#383633] flex items-center justify-center">
            {icon}
          </span>
        )}
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </h2>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
