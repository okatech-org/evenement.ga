import { prisma } from "@/lib/db";

/**
 * Requetes auth directes vers Prisma (remplace les appels Convex)
 */

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      image: true,
      role: true,
      plan: true,
      isDemoAccount: true,
      demoAccountType: true,
    },
  });
}

export async function createUser(data: {
  email: string;
  name: string;
  password: string;
}) {
  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: data.password,
      role: "ORGANIZER",
      plan: "FREE",
    },
  });
}

export async function upsertOAuthUser(data: {
  email: string;
  name?: string;
  image?: string;
}) {
  return prisma.user.upsert({
    where: { email: data.email },
    update: {
      name: data.name ?? undefined,
      image: data.image ?? undefined,
    },
    create: {
      email: data.email,
      name: data.name,
      image: data.image,
      role: "ORGANIZER",
      plan: "FREE",
    },
  });
}

export async function findUserByPhone(phone: string) {
  return prisma.user.findUnique({
    where: { phone },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      plan: true,
      isDemoAccount: true,
      demoAccountType: true,
    },
  });
}

export async function getOrCreateByPhone(phone: string) {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      phone,
      email: `${phone}@whatsapp.eventflow`,
      role: "ORGANIZER",
      plan: "FREE",
    },
  });
}

export async function verifyOtp(phone: string, code: string) {
  return prisma.otpCode.findFirst({
    where: {
      phone,
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });
}

export async function markOtpUsed(otpId: string) {
  return prisma.otpCode.update({
    where: { id: otpId },
    data: { used: true },
  });
}
