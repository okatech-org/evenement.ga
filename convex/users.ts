import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Register ──────────────────────────────────────
export const register = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("Cet email est déjà utilisé");
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      password: args.password, // hashed on client side
      role: "ORGANIZER",
      plan: "FREE",
    });

    return userId;
  },
});

// ─── Get User by Email ─────────────────────────────
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// ─── Get User by ID ────────────────────────────────
export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

// ─── Upsert from OAuth (Google, Apple) ─────────────
export const upsertFromOAuth = mutation({
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
      return existing._id;
    }

    return ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      image: args.image,
      role: "ORGANIZER",
      plan: "FREE",
      emailVerified: Date.now(),
    });
  },
});

// ─── Create/Get User from Phone (WhatsApp OTP) ────
export const getOrCreateByPhone = mutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (existing) return existing;

    const id = await ctx.db.insert("users", {
      phone: args.phone,
      email: `wa_${args.phone.replace(/\+/g, "")}@whatsapp.placeholder`,
      name: `WhatsApp ${args.phone}`,
      role: "ORGANIZER",
      plan: "FREE",
    });

    return ctx.db.get(id);
  },
});

// ─── Mark OTP as Used ──────────────────────────────
export const markOtpUsed = mutation({
  args: { otpId: v.id("otpCodes") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.otpId, { used: true });
  },
});

// ─── List All Users (superadmin) ───────────────────
export const listAll = query({
  handler: async (ctx) => {
    return ctx.db.query("users").collect();
  },
});

