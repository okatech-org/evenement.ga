import NextAuth from "next-auth";
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
        // Desactiver PKCE — le cookie PKCE chiffre (JWE) utilise le nom du
        // cookie comme salt HKDF. Derriere le proxy chain (Fastly CDN →
        // Firebase Hosting → Cloud Run), la detection HTTPS peut varier
        // entre le POST signin et le GET callback, changeant le prefixe
        // du cookie (__Secure- vs sans prefixe) et donc la salt.
        // Resultat: "pkceCodeVerifier value could not be parsed".
        // Le check "state" est tout aussi securise et n'utilise pas de
        // chiffrement de cookie — il compare juste un token signé.
        checks: ["state"],
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

        const user = await findUserByEmail(credentials.email as string);

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

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: authSecret,
  // Force HTTPS cookies — sinon le proxy peut faire varier la detection
  // entre les requetes signin et callback, cassant la verification PKCE
  useSecureCookies: isProduction,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 jours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  // Configuration explicite des cookies pour eviter les inconsistances
  // de noms (avec/sans prefixe __Secure-) entre encrypt et decrypt.
  // La salt JWE etant le nom du cookie, toute variation casse le PKCE.
  cookies: {
    sessionToken: {
      name: isProduction ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    callbackUrl: {
      name: isProduction ? "__Secure-authjs.callback-url" : "authjs.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    csrfToken: {
      name: isProduction ? "__Host-authjs.csrf-token" : "authjs.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    pkceCodeVerifier: {
      name: isProduction ? "__Secure-authjs.pkce.code_verifier" : "authjs.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
        maxAge: 60 * 15, // 15 minutes
      },
    },
    state: {
      name: isProduction ? "__Secure-authjs.state" : "authjs.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
        maxAge: 60 * 15,
      },
    },
    nonce: {
      name: isProduction ? "__Secure-authjs.nonce" : "authjs.nonce",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
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

// ─── Exported helper: which OAuth providers are active ──────
// Used by the login/register pages to show/hide buttons.
export const ENABLED_OAUTH_PROVIDERS = {
  google: !!(process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID.startsWith("your-")),
  apple: !!(process.env.APPLE_CLIENT_ID && !process.env.APPLE_CLIENT_ID.startsWith("your-") &&
    process.env.APPLE_CLIENT_SECRET && !process.env.APPLE_CLIENT_SECRET.startsWith("your-")),
};
