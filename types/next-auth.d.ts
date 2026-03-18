import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      plan: string;
      isDemoAccount?: boolean;
      demoAccountType?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    plan: string;
    isDemoAccount?: boolean;
    demoAccountType?: string;
  }
}
