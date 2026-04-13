import { query, mutation } from "./_generated/server";
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

// ─── Mark OTP as Used ──────────────────────────────
export const markOtpUsed = mutation({
  args: { otpId: v.id("otpCodes") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.otpId, { used: true });
  },
});

// ─── Upsert OAuth User (Google/Apple sign-in) ──────
export const upsertOAuthUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.image !== undefined ? { image: args.image } : {}),
      });
      return existing._id;
    }

    return ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      image: args.image,
      role: "ORGANIZER",
      plan: "FREE",
    });
  },
});

// ─── Create User (Registration) ────────────────────
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      password: args.password,
      role: "ORGANIZER",
      plan: "FREE",
    });
    const user = await ctx.db.get(id);
    return { id: id, email: user!.email, name: user!.name };
  },
});

// ─── Get Or Create User by Phone (WhatsApp) ────────
export const getOrCreateByPhone = mutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (existing) {
      return {
        _id: existing._id,
        email: existing.email,
        name: existing.name,
        image: existing.image,
        role: existing.role,
        plan: existing.plan,
      };
    }

    const id = await ctx.db.insert("users", {
      phone: args.phone,
      email: `${args.phone}@whatsapp.eventflow`,
      role: "ORGANIZER",
      plan: "FREE",
    });
    const user = await ctx.db.get(id);
    return {
      _id: id,
      email: user!.email,
      name: user!.name,
      image: user!.image,
      role: user!.role,
      plan: user!.plan,
    };
  },
});
