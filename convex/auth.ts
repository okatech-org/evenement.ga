import { query } from "./_generated/server";
import { v } from "convex/values";

// ─── Verify Credentials (used by NextAuth) ─────────
// Returns user data if email exists (password is verified on the Next.js side with bcryptjs)
export const getUserForAuth = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) return null;

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      password: user.password,
      image: user.image,
      role: user.role,
      plan: user.plan,
      isDemoAccount: user.isDemoAccount ?? false,
      demoAccountType: user.demoAccountType,
      phone: user.phone,
    };
  },
});

// ─── Get Demo User ─────────────────────────────────
export const getDemoUser = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user || !user.isDemoAccount) return null;

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      isDemoAccount: user.isDemoAccount,
      demoAccountType: user.demoAccountType,
    };
  },
});

// ─── Get User by Phone ─────────────────────────────
export const getUserByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
  },
});

// ─── Verify OTP ────────────────────────────────────
export const verifyOtp = query({
  args: { phone: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const otp = await ctx.db
      .query("otpCodes")
      .withIndex("by_phone_code", (q) =>
        q.eq("phone", args.phone).eq("code", args.code)
      )
      .first();

    if (!otp || otp.used || otp.expiresAt < now) return null;
    return otp;
  },
});
