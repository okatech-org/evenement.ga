import { handlers } from "@/lib/auth";

// La route auth depend de pg/Prisma (Node.js) et de variables d'env runtime
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const { GET, POST } = handlers;
