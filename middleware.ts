import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Middleware — Route protection (Edge Runtime compatible)
 *
 * Uses next-auth/jwt getToken() which doesn't need DB access.
 * Protected routes: /dashboard, /events, /onboarding, /superadmin
 * Public routes: everything else (including /demo)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check JWT token (Edge-compatible, no DB import needed)
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  });

  // ─── Super Admin routes ───────────────────────────────────
  if (pathname.startsWith("/superadmin")) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (token.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  // ─── Regular protected routes ─────────────────────────────
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/events/:path*",
    "/onboarding/:path*",
    "/superadmin/:path*",
  ],
};
