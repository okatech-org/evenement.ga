import path from "node:path";
import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Load .env.local for DATABASE_URL (Next.js env files aren't auto-loaded by Prisma CLI)
config({ path: path.join(__dirname, ".env.local") });

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
