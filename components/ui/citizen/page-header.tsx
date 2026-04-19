import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  /** Classes Tailwind pour le fond + texte icône (ex. "bg-persona-organizer/15 text-persona-organizer") */
  iconClassName?: string;
  actions?: React.ReactNode;
}

/**
 * PageHeader — En-tête de page dashboard (charte §5.7).
 */
export function PageHeader({
  title,
  subtitle,
  icon,
  iconClassName = "bg-primary/10 text-primary",
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-4 mb-5",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <span
            className={cn(
              "rounded-lg p-2 flex items-center justify-center shrink-0",
              iconClassName
            )}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight leading-none truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  );
}
