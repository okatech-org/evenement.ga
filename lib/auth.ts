import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { convexClient } from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";

async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  const { compare } = await import("bcryptjs");
  return compare(plain, hashed);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Apple({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    }),
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

        const user = await convexClient.query(api.auth.getUserForAuth, {
          email: credentials.email as string,
        });

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
          id: user._id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          plan: user.plan,
        };
      },
    }),
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

        // Verify OTP via Convex
        const otpRecord = await convexClient.query(api.auth.verifyOtp, {
          phone,
          code: otp,
        });

        if (!otpRecord) {
          throw new Error("Code OTP invalide ou expiré");
        }

        // Mark OTP as used
        await convexClient.mutation(api.users.markOtpUsed, {
          otpId: otpRecord._id,
        });

        // Find or create user by phone
        const user = await convexClient.mutation(api.users.getOrCreateByPhone, {
          phone,
        });

        if (!user) {
          throw new Error("Erreur lors de la création du compte");
        }

        return {
          id: user._id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          plan: user.plan,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "apple") {
        await convexClient.mutation(api.users.upsertFromOAuth, {
          email: user.email!,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await convexClient.query(api.auth.getUserForAuth, {
          email: token.email!,
        });
        if (dbUser) {
          token.id = dbUser._id;
          token.role = dbUser.role;
          token.plan = dbUser.plan;
          token.isDemoAccount = dbUser.isDemoAccount;
          token.demoAccountType = dbUser.demoAccountType ?? undefined;
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
