import { headers } from "next/headers";

type LogLevel = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

type LogCategory =
  | "AUTH"
  | "EVENT"
  | "PAYMENT"
  | "ADMIN"
  | "SYSTEM"
  | "DEMO"
  | "MODERATION";

interface LogOptions {
  actorId?: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}

/**
 * Log a system event.
 * Uses console.log as a lightweight fallback — Convex logs are handled client-side.
 * This function is designed to NEVER throw — logging failures
 * should not crash the application.
 */
export async function logSystem(
  level: LogLevel,
  category: LogCategory,
  action: string,
  options: LogOptions = {}
): Promise<void> {
  try {
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (options.req) {
      ipAddress =
        options.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        options.req.headers.get("x-real-ip") ||
        null;
      userAgent = options.req.headers.get("user-agent") || null;
    } else {
      try {
        const h = await headers();
        ipAddress =
          h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          h.get("x-real-ip") ||
          null;
        userAgent = h.get("user-agent") || null;
      } catch {
        // headers() not available outside of request context
      }
    }

    // Log to console (visible in Cloud Run logs)
    console.log(
      JSON.stringify({
        level,
        category,
        action,
        actorId: options.actorId || null,
        targetId: options.targetId || null,
        targetType: options.targetType || null,
        metadata: options.metadata || null,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error) {
    // Silent failure — never crash the app due to logging
    console.error("[SystemLog] Failed to write log:", error);
  }
}
