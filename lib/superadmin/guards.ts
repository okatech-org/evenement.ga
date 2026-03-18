import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { logSystem } from "./logger";

type ApiHandler = (
  req: Request,
  context: { params: Record<string, string> }
) => Promise<Response>;

/**
 * Wrap an API route handler with SUPER_ADMIN role verification.
 * Logs every access attempt.
 */
export function withSuperAdmin(handler: ApiHandler): ApiHandler {
  return async (req, context) => {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    if (session.user.role !== "SUPER_ADMIN") {
      await logSystem("WARNING", "ADMIN", "UNAUTHORIZED_ACCESS_ATTEMPT", {
        actorId: session.user.id,
        metadata: {
          attemptedRoute: req.url,
          userRole: session.user.role,
          requiredRole: "SUPER_ADMIN",
        },
        req,
      });

      return NextResponse.json(
        { success: false, error: "Accès réservé aux super administrateurs" },
        { status: 403 }
      );
    }

    await logSystem("INFO", "ADMIN", `API_ACCESS`, {
      actorId: session.user.id,
      metadata: {
        route: req.url,
        method: req.method,
      },
      req,
    });

    return handler(req, context);
  };
}

/**
 * Wrap an API route handler with MODERATOR or SUPER_ADMIN role verification.
 */
export function withModerator(handler: ApiHandler): ApiHandler {
  return async (req, context) => {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const allowed = ["SUPER_ADMIN", "MODERATOR"];
    if (!allowed.includes(session.user.role)) {
      await logSystem("WARNING", "ADMIN", "UNAUTHORIZED_ACCESS_ATTEMPT", {
        actorId: session.user.id,
        metadata: {
          attemptedRoute: req.url,
          userRole: session.user.role,
          requiredRoles: allowed,
        },
        req,
      });

      return NextResponse.json(
        { success: false, error: "Accès réservé aux modérateurs" },
        { status: 403 }
      );
    }

    return handler(req, context);
  };
}

/**
 * Wrap an API route handler with ADMIN, MODERATOR or SUPER_ADMIN role verification.
 */
export function withAdmin(handler: ApiHandler): ApiHandler {
  return async (req, context) => {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const allowed = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];
    if (!allowed.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: "Accès réservé aux administrateurs" },
        { status: 403 }
      );
    }

    return handler(req, context);
  };
}
