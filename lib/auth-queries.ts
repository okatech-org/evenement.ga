import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Auth queries via Convex (replaces Prisma)
 * Used by NextAuth authorize(), register route, and demo login
 */

export async function findUserByEmail(email: string) {
  const user = await convexClient.query(api.auth.getUserForAuth, { email });
  if (!user) return null;

  return {
    id: user._id as string,
    email: user.email,
    name: user.name ?? null,
    password: user.password ?? null,
    image: user.image ?? null,
    role: user.role,
    plan: user.plan,
    isDemoAccount: user.isDemoAccount ?? false,
    demoAccountType: user.demoAccountType ?? null,
  };
}

export async function createUser(data: {
  email: string;
  name: string;
  password: string;
}) {
  const result = await convexClient.mutation(api.auth.createUser, {
    email: data.email,
    name: data.name,
    password: data.password,
  });
  return result;
}

export async function upsertOAuthUser(data: {
  email: string;
  name?: string;
  image?: string;
}) {
  await convexClient.mutation(api.auth.upsertOAuthUser, {
    email: data.email,
    name: data.name,
    image: data.image,
  });
}

export async function findUserByPhone(phone: string) {
  const user = await convexClient.query(api.auth.getUserByPhone, { phone });
  if (!user) return null;

  return {
    id: user._id as string,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    role: user.role,
    plan: user.plan,
    isDemoAccount: user.isDemoAccount ?? false,
    demoAccountType: user.demoAccountType ?? null,
  };
}

export async function getOrCreateByPhone(phone: string) {
  const user = await convexClient.mutation(api.auth.getOrCreateByPhone, {
    phone,
  });
  if (!user) return null;

  return {
    id: user._id as string,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    role: user.role,
    plan: user.plan,
  };
}

export async function verifyOtp(phone: string, code: string) {
  const otp = await convexClient.query(api.auth.verifyOtp, { phone, code });
  if (!otp) return null;

  return {
    id: otp._id as string,
  };
}

export async function markOtpUsed(otpId: string) {
  await convexClient.mutation(api.auth.markOtpUsed, {
    otpId: otpId as Id<"otpCodes">,
  });
}
