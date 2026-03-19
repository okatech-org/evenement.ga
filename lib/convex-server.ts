import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

// Singleton ConvexHttpClient for server-side usage (API routes, NextAuth, SSR)
function createConvexClient() {
  if (!CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  return new ConvexHttpClient(CONVEX_URL);
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
