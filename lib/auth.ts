import NextAuth from "next-auth";
import { skipCSRFCheck } from "@auth/core";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import {
  findUserByEmail,
  upsertOAuthUser,
  verifyOtp,
  markOtpUsed,
  getOrCreateByPhone,
} from "@/lib/auth-queries";

async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  const { compare } = await import("bcryptjs");
  return compare(plain, hashed);
}

// ─── Build providers list dynamically ───────────────────────
// Only register OAuth providers that have real credentials configured.
// This prevents NextAuth from crashing when Apple/Google secrets are placeholders.

function buildProviders() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const providers: any[] = [];

  // ── Google ──
  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (googleId && googleSecret && !googleId.startsWith("your-")) {
    providers.push(
      Google({
        clientId: googleId,
        clientSecret: googleSecret,
        // Disable PKCE/state checks because Firebase Hosting strips all cookies 
        // except __session, which causes pkceCodeVerifier parsing to fail.
        checks: ["none"],
      })
    );
  }

  // ── Apple ──
  const appleId = process.env.APPLE_CLIENT_ID;
  const appleSecret = process.env.APPLE_CLIENT_SECRET;
  if (appleId && appleSecret && !appleId.startsWith("your-") && !appleSecret.startsWith("your-")) {
    providers.push(
      Apple({
        clientId: appleId,
        clientSecret: appleSecret,
      })
    );
  }

  // ── Credentials: Email/Password ──
  providers.push(
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis");
        }

        const emailLower = (credentials.email as string).toLowerCase().trim();
        const user = await findUserByEmail(emailLower);

        if (!user || !user.password) {
          throw new Error("Email ou mot de passe incorrect");
        }

        const isPasswordValid = await verifyPassword(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Email ou mot de passe incorrect");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          plan: user.plan,
        };
      },
    })
  );

  // ── Credentials: WhatsApp OTP ──
  providers.push(
    Credentials({
      id: "whatsapp-otp",
      name: "WhatsApp",
      credentials: {
        phone: { label: "Téléphone", type: "tel" },
        otp: { label: "Code OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.otp) {
          throw new Error("Numéro de téléphone et code OTP requis");
        }

        const phone = credentials.phone as string;
        const otp = credentials.otp as string;

        // Verifier l'OTP via Prisma
        const otpRecord = await verifyOtp(phone, otp);

        if (!otpRecord) {
          throw new Error("Code OTP invalide ou expiré");
        }

        // Marquer l'OTP comme utilise
        await markOtpUsed(otpRecord.id);

        // Trouver ou creer l'utilisateur par telephone
        const user = await getOrCreateByPhone(phone);

        if (!user) {
          throw new Error("Erreur lors de la création du compte");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          plan: user.plan,
        };
      },
    })
  );

  return providers;
}

// ─── Resolve auth secret with runtime validation ──────────
const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

if (!authSecret) {
  console.error(
    "[auth] FATAL: Neither AUTH_SECRET nor NEXTAUTH_SECRET is set. " +
      "NextAuth will fail with a Configuration error. " +
      "Set AUTH_SECRET in your environment variables."
  );
}

// ─── Detect production environment ────────────────────────
// Force secure cookies in production behind reverse proxy (Cloud Run + Firebase Hosting)
// pour eviter les inconsistances de detection HTTPS qui cassent le PKCE flow.
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.AUTH_URL?.startsWith("https://") ||
  process.env.NEXTAUTH_URL?.startsWith("https://");

// ─── Firebase Hosting compatibility ───────────────────────
// Firebase Hosting strips ALL incoming cookies EXCEPT `__session`.
// This breaks NextAuth default cookies (session, CSRF, callback-url, PKCE).
// Solution:
//   1. Rename session token to `__session` (only cookie preserved by Firebase)
//   2. OAuth providers use `checks: ["none"]` (PKCE/state cookies stripped)
//   3. skipCSRFCheck bypasses server-side CSRF validation. This makes the
//      /api/auth/csrf route return 404. We provide a custom wrapper in the
//      route handler to serve a synthetic CSRF token for client compatibility.
//      Security is maintained via HTTPS + SameSite=Lax + browser Origin.
// Reference: https://firebase.google.com/docs/hosting/manage-cache#using_cookies

const nextAuth = NextAuth({
  trustHost: true,
  secret: authSecret,
  useSecureCookies: isProduction,
  skipCSRFCheck,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 jours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  cookies: {
    // Seul cookie preserve par Firebase Hosting. Doit s'appeler
    // EXACTEMENT "__session" (pas de prefixe __Secure-/__Host-).
    sessionToken: {
      name: "__session",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
        maxAge: 7 * 24 * 60 * 60,
      },
    },
  },
  providers: buildProviders(),
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "apple") {
        try {
          await upsertOAuthUser({
            email: user.email!,
            name: user.name ?? undefined,
            image: user.image ?? undefined,
          });
        } catch (error) {
          console.error("[auth] upsertOAuthUser failed:", error);
          // Don't block sign-in — user profile will sync on next login
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        try {
          let dbUser = await findUserByEmail(token.email!);
          // If OAuth user not found, create them now (fallback)
          if (!dbUser && (account?.provider === "google" || account?.provider === "apple")) {
            await upsertOAuthUser({
              email: user.email!,
              name: user.name ?? undefined,
              image: user.image ?? undefined,
            });
            dbUser = await findUserByEmail(token.email!);
          }
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.plan = dbUser.plan;
            token.isDemoAccount = dbUser.isDemoAccount;
            token.demoAccountType = dbUser.demoAccountType ?? undefined;
          }
        } catch (error) {
          console.error("[auth] jwt callback error:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.plan = token.plan as string;
        session.user.isDemoAccount = token.isDemoAccount as boolean;
        session.user.demoAccountType = token.demoAccountType as string;
      }
      return session;
    },
  },
});

// Re-export auth, signIn, signOut from the wrapped NextAuth instance
export const { auth, signIn, signOut } = nextAuth;

// ─── Custom handlers wrapper ───────────────────────────────
// skipCSRFCheck makes Auth.js return 404 for GET /api/auth/csrf.
// But next-auth/react's signIn() calls getCsrfToken() which fetches
// this endpoint and expects a JSON response. If it gets 404, it
// receives HTML and res.json() throws, breaking the entire signIn flow.
//
// Solution: wrap the GET handler to intercept the csrf action and
// return a synthetic token. The server doesn't validate it anyway
// (skipCSRFCheck is active), so the value doesn't matter.
import { NextResponse } from "next/server";
import { createHash } from "crypto";

const { handlers: originalHandlers } = nextAuth;

async function generateSyntheticCsrf(): Promise<string> {
  const token = Math.random().toString(36).slice(2);
  return createHash("sha256").update(token + (authSecret ?? "")).digest("hex");
}

export const handlers = {
  GET: async (req: Request) => {
    const url = new URL(req.url);
    // Intercept /api/auth/csrf specifically
    if (url.pathname.endsWith("/csrf")) {
      const csrfToken = await generateSyntheticCsrf();
      return NextResponse.json(
        { csrfToken },
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-cache, no-store",
            Expires: "0",
            Pragma: "no-cache",
          },
        }
      );
    }
    return originalHandlers.GET(req);
  },
  POST: originalHandlers.POST,
};

// ─── Exported helper: which OAuth providers are active ──────
// Used by the login/register pages to show/hide buttons.
export const ENABLED_OAUTH_PROVIDERS = {
  google: !!(process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID.startsWith("your-")),
  apple: !!(process.env.APPLE_CLIENT_ID && !process.env.APPLE_CLIENT_ID.startsWith("your-") &&
    process.env.APPLE_CLIENT_SECRET && !process.env.APPLE_CLIENT_SECRET.startsWith("your-")),
};
