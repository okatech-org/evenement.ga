import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import slugifyLib from "slugify";

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a URL-safe slug from a string (French-friendly)
 */
export function slugify(text: string): string {
  return slugifyLib(text, {
    lower: true,
    strict: true,
    locale: "fr",
    trim: true,
  });
}

/**
 * Format a date for display
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options,
  }).format(d);
}

/**
 * Format a relative time (e.g., "il y a 5 min")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return "à l'instant";
  if (diffInSeconds < 3600)
    return `il y a ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400)
    return `il y a ${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800)
    return `il y a ${Math.floor(diffInSeconds / 86400)}j`;
  return formatDate(d);
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
