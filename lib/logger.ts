/**
 * Logger conditionnel — n'affiche les erreurs que en developpement.
 * En production, les erreurs critiques sont enregistrees via SystemLog.
 */

const isDev = process.env.NODE_ENV === "development";

export function logError(context: string, error: unknown): void {
  if (isDev) {
    console.error(`[${context}]`, error);
  }
}

export function logWarn(context: string, message: string): void {
  if (isDev) {
    console.warn(`[${context}]`, message);
  }
}
