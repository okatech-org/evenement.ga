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
