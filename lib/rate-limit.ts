/**
 * Rate limiter distribue avec Upstash Redis
 * Fallback sur Map en memoire si Redis n'est pas configure (dev local)
 */
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// ─── Redis client (lazy init) ──────────────────────────
let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;
  // Skip if missing or placeholder values from .env.example
  if (!url || !token || url.startsWith("your-") || !url.startsWith("https://")) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// ─── Fallback en memoire pour le dev local ─────────────
const memoryStore = new Map<string, { count: number; resetAt: number }>();
const CLEANUP_INTERVAL = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupMemory() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  memoryStore.forEach((entry, key) => {
    if (now > entry.resetAt) memoryStore.delete(key);
  });
}

function memoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupMemory();
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

// ─── Cache des Ratelimit instances ─────────────────────
const rlCache = new Map<string, Ratelimit>();

function getOrCreateRatelimit(maxRequests: number, windowMs: number): Ratelimit {
  const redis = getRedis();
  if (!redis) {
    throw new Error("Redis not available");
  }

  const cacheKey = `${maxRequests}:${windowMs}`;
  let rl = rlCache.get(cacheKey);
  if (!rl) {
    rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms`),
      prefix: "rl",
    });
    rlCache.set(cacheKey, rl);
  }
  return rl;
}

// ─── API publique ──────────────────────────────────────
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redis = getRedis();

  if (!redis) {
    // Fallback memoire pour le dev local
    return memoryRateLimit(key, maxRequests, windowMs);
  }

  try {
    const rl = getOrCreateRatelimit(maxRequests, windowMs);
    const result = await rl.limit(key);
    return {
      allowed: result.success,
      remaining: result.remaining,
      resetAt: result.reset,
    };
  } catch {
    // Si Redis echoue, fallback memoire
    return memoryRateLimit(key, maxRequests, windowMs);
  }
}

// Version synchrone pour les cas ou l'on ne peut pas await
// (maintient la compatibilite avec le code existant)
export function rateLimitSync(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  return memoryRateLimit(key, maxRequests, windowMs);
}

/**
 * Extraire l'IP de la requete
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
