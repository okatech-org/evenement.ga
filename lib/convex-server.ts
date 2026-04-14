import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";

// Singleton ConvexHttpClient for server-side usage (API routes, NextAuth, SSR)
// During Docker build, NEXT_PUBLIC_CONVEX_URL may be empty — we return a lazy proxy
// that only throws when actually called at runtime.
function createConvexClient(): ConvexHttpClient {
  if (!CONVEX_URL) {
    console.warn(
      "⚠️ NEXT_PUBLIC_CONVEX_URL not set — Convex client is a build-time stub."
    );
    return new Proxy({} as ConvexHttpClient, {
      get(_target, prop) {
        if (
          prop === "then" ||
          prop === Symbol.toPrimitive ||
          prop === Symbol.toStringTag ||
          prop === "$$typeof" ||
          prop === "constructor"
        ) {
          return undefined;
        }
        // Return an async function that throws at runtime
        return (...args: unknown[]) => {
          void args;
          throw new Error(
            `NEXT_PUBLIC_CONVEX_URL is not configured. Cannot call convexClient.${String(prop)}(). ` +
              `Set NEXT_PUBLIC_CONVEX_URL in your environment variables.`
          );
        };
      },
    });
  }

  // Force cache: "no-store" to prevent Next.js from caching GET queries (like getUserForAuth)
  const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      cache: "no-store",
    });
  };

  return new ConvexHttpClient(CONVEX_URL, { fetch: customFetch });
}

const globalForConvex = globalThis as unknown as {
  convexClient: ConvexHttpClient | undefined;
};

export const convexClient =
  globalForConvex.convexClient ?? createConvexClient();

if (process.env.NODE_ENV !== "production") {
  globalForConvex.convexClient = convexClient;
}

export default convexClient;
