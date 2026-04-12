import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // During `next build` inside Docker, DATABASE_URL is not set.
    // Return a proxy stub that will throw a clear error only when
    // actually queried at runtime — not at import/build time.
    console.warn(
      "⚠️ DATABASE_URL not set — Prisma client is a build-time stub. " +
        "Ensure DATABASE_URL is set in the runtime environment."
    );
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        // Allow JS internals to inspect the object without crashing
        if (
          prop === "then" ||
          prop === Symbol.toPrimitive ||
          prop === Symbol.toStringTag ||
          prop === "$$typeof" ||
          prop === "constructor"
        ) {
          return undefined;
        }
        throw new Error(
          `DATABASE_URL is not configured. Cannot access prisma.${String(prop)}. ` +
            `Set DATABASE_URL in your environment variables.`
        );
      },
    });
  }

  const pool = new pg.Pool({ connectionString });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(pool as any);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
