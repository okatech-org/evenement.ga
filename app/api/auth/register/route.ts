import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { findUserByEmail, createUser } from "@/lib/auth-queries";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { checkRegistrationAllowed } from "@/lib/global-config";
import { logSystem } from "@/lib/superadmin/logger";

const RegisterSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export async function POST(request: Request) {
  try {
    // Verifier si les inscriptions sont autorisees
    const regBlock = await checkRegistrationAllowed();
    if (regBlock) return regBlock;

    // Rate limiting: 5 inscriptions par IP par heure
    const ip = getClientIp(request);
    const rl = await rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Trop de tentatives d'inscription. Réessayez plus tard." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validatedData = RegisterSchema.parse(body);

    // Verifier si l'utilisateur existe deja
    const existingUser = await findUserByEmail(validatedData.email);

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte avec cet email existe déjà" },
        { status: 409 }
      );
    }

    // Hasher le mot de passe (cost 12)
    const hashedPassword = await hash(validatedData.password, 12);

    // Creer l'utilisateur via Prisma
    const user = await createUser({
      email: validatedData.email,
      name: `${validatedData.firstName} ${validatedData.lastName}`,
      password: hashedPassword,
    });

    logSystem("INFO", "AUTH", "USER_REGISTERED", { actorId: user.id, metadata: { email: validatedData.email } });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
