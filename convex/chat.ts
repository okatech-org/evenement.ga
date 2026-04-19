import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { formatGuestDisplayName } from "./lib/guestDisplayName";

// ─── Send Message ──────────────────────────────────
// Acces reserve aux invites ayant confirme leur presence (status = CONFIRMED).
// Le nom affiche ("Prenom I.") est toujours reconstruit cote serveur — args.senderName est ignore.
export const send = mutation({
  args: {
    eventId: v.id("events"),
    channel: v.string(),
    content: v.string(),
    type: v.optional(v.string()), // TEXT | IMAGE | REACTION — default "TEXT"
    senderName: v.optional(v.string()), // Ignore cote serveur — reconstruit depuis le guest record
    senderRole: v.optional(v.string()), // Ignore cote serveur — toujours "GUEST" via ce chemin
    replyToId: v.optional(v.id("chatMessages")),
    inviteToken: v.string(), // Requis : seuls les invites peuvent poster
  },
  handler: async (ctx, args) => {
    // Validation longueur
    const content = args.content.trim();
    if (content.length === 0) throw new Error("Message vide");
    if (content.length > 500) throw new Error("Message trop long (max 500 caracteres)");

    // Verifier le token et le scope event
    const guest = await ctx.db
      .query("guests")
      .withIndex("by_invite_token", (q) => q.eq("inviteToken", args.inviteToken))
      .first();
    if (!guest || guest.eventId !== args.eventId) {
      throw new Error("Invitation invalide pour cet evenement");
    }
    // Verifier que l'invitation est acceptee (presence confirmee)
    if (guest.status !== "CONFIRMED") {
      throw new Error("Vous devez confirmer votre presence pour participer au salon");
    }

    // Nom toujours reconstruit cote serveur — pas de confiance envers le client
    const resolvedSenderName = formatGuestDisplayName(guest.firstName, guest.lastName);

    return ctx.db.insert("chatMessages", {
      eventId: args.eventId,
      channel: args.channel,
      content,
      type: args.type ?? "TEXT",
      senderName: resolvedSenderName,
      senderRole: "GUEST",
      replyToId: args.replyToId,
    });
  },
});

// ─── List Messages (real-time!) ────────────────────
export const list = query({
  args: {
    eventId: v.id("events"),
    channel: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_event_channel", (q) =>
        q.eq("eventId", args.eventId).eq("channel", args.channel)
      )
      .order("asc")
      .take(200);

    // Enrich with reply-to content (resolu cote serveur pour eviter N+1 cote client)
    const replyIds = messages.map((m) => m.replyToId).filter((id): id is NonNullable<typeof id> => !!id);
    const replies = replyIds.length > 0
      ? await Promise.all(replyIds.map((id) => ctx.db.get(id)))
      : [];
    const replyMap = new Map(
      replies.filter((r): r is NonNullable<typeof r> => !!r).map((r) => [r._id, r])
    );

    return messages.map((msg) => ({
      _id: msg._id,
      _creationTime: msg._creationTime,
      content: msg.content,
      type: msg.type,
      senderName: msg.senderName ?? "Anonyme",
      senderRole: msg.senderRole ?? "GUEST",
      replyToId: msg.replyToId ?? null,
      replyTo: msg.replyToId
        ? (() => {
            const r = replyMap.get(msg.replyToId as never);
            return r ? { id: r._id, senderName: r.senderName ?? "Anonyme", content: r.content } : null;
          })()
        : null,
      reactions: msg.reactions ?? null,
      userId: msg.userId ?? null,
    }));
  },
});

// ─── Delete Message (auteur OU organisateur) ─────────
export const remove = mutation({
  args: {
    messageId: v.id("chatMessages"),
    inviteToken: v.optional(v.string()), // Pour verifier l'auteur
    email: v.optional(v.string()), // Pour verifier l'organisateur
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message introuvable");

    let allowed = false;

    // Cas 1 : l'auteur supprime son propre message (via inviteToken)
    if (args.inviteToken) {
      const guest = await ctx.db
        .query("guests")
        .withIndex("by_invite_token", (q) => q.eq("inviteToken", args.inviteToken!))
        .first();
      // Match par nom affiche reconstitue (format "Prenom I." identique au send)
      if (guest && guest.eventId === message.eventId) {
        const expectedName = formatGuestDisplayName(guest.firstName, guest.lastName);
        if (message.senderName === expectedName) {
          allowed = true;
        }
      }
    }

    // Cas 2 : l'organisateur de l'event supprime n'importe quel message
    if (!allowed && args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email!))
        .first();
      if (user) {
        const event = await ctx.db.get(message.eventId);
        if (event && event.userId === user._id) {
          allowed = true;
        }
      }
    }

    if (!allowed) throw new Error("Non autorise a supprimer ce message");

    await ctx.db.delete(args.messageId);
    return { success: true };
  },
});

// ─── Toggle Reaction ─────────────────────────────────
// Stocke les reactions dans un JSON string {emoji: count}
export const toggleReaction = mutation({
  args: {
    messageId: v.id("chatMessages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message introuvable");

    let reactions: Record<string, number> = {};
    try {
      if (message.reactions) reactions = JSON.parse(message.reactions);
    } catch {
      reactions = {};
    }

    reactions[args.emoji] = (reactions[args.emoji] ?? 0) + 1;

    await ctx.db.patch(args.messageId, { reactions: JSON.stringify(reactions) });
    return { success: true, reactions };
  },
});
