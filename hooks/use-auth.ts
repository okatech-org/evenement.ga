"use client";

import { useSession, signOut } from "next-auth/react";

/**
 * Custom auth hook wrapping NextAuth useSession
 */
export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user ?? null,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    signOut: () => signOut({ callbackUrl: "/" }),
  };
}
