"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Types ──────────────────────────────────────────────────

interface ReplyTo {
  id: string;
  senderName: string;
  content: string;
}

interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: string;
  text: string;
  reactions: Record<string, number>;
  replyTo: ReplyTo | null;
  sentAt: string;
}

interface ChatBubbleProps {
  eventId: string;
  initialMessages: ChatMessage[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    surface: string;
    muted: string;
    border: string;
  };
  fontBody: string;
  /** Nom a afficher ("Prenom D."). Si present et hasConfirmedPresence true -> auto-join. */
  guestName?: string;
  /** True si l'invite a confirme sa presence (RSVP accepte). Seul pre-requis pour poster. */
  hasConfirmedPresence?: boolean;
  /** Token d'invite pour scoper le chat au guest (authentifier coté Convex) */
  inviteToken?: string;
  /** Email de l'organisateur (s'il est connecte et peut moderer) */
  organizerEmail?: string;
}

// ─── URL auto-link helper ───────────────────────────────────
function renderWithLinks(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Map Convex message to UI message ───────────────────────
type ConvexMessage = {
  _id: string;
  _creationTime: number;
  content: string;
  senderName: string;
  senderRole: string;
  replyToId: string | null;
  replyTo: { id: string; senderName: string; content: string } | null;
  reactions: string | null;
};

function mapConvexMessage(m: ConvexMessage): ChatMessage {
  let reactions: Record<string, number> = {};
  if (m.reactions) {
    try {
      const parsed = JSON.parse(m.reactions);
      if (parsed && typeof parsed === "object") reactions = parsed;
    } catch {
      // ignore
    }
  }
  return {
    id: m._id,
    senderName: m.senderName,
    senderRole: m.senderRole,
    text: m.content,
    reactions,
    replyTo: m.replyTo,
    sentAt: new Date(m._creationTime).toISOString(),
  };
}

// ─── Color Hash ─────────────────────────────────────────────

const AVATAR_COLORS = [
  "#E57373", "#F06292", "#BA68C8", "#9575CD", "#7986CB",
  "#64B5F6", "#4FC3F7", "#4DD0E1", "#4DB6AC", "#81C784",
  "#AED581", "#FFD54F", "#FFB74D", "#FF8A65", "#A1887F",
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Emoji Picker ───────────────────────────────────────────

const QUICK_REACTIONS = ["❤️", "😂", "👏", "🎉", "😮", "😢"];

// ─── Component ──────────────────────────────────────────────

export function ChatBubble({
  eventId,
  initialMessages,
  colors,
  fontBody,
  guestName,
  hasConfirmedPresence = false,
  inviteToken,
  organizerEmail,
}: ChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Nom auto quand la presence est confirmee : "Prenom D." (immuable)
  // Sinon, on n'autorise pas l'ecriture du tout (ou l'organisateur via email)
  const canPost = hasConfirmedPresence || !!organizerEmail;
  const autoName = guestName || "";
  const [name] = useState(autoName);
  const [nameConfirmed] = useState(!!autoName && canPost);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenCount, setLastSeenCount] = useState(initialMessages?.length || 0);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Convex real-time ─────────────────────────────
  const convexMessages = useQuery(api.chat.list, {
    eventId: eventId as Id<"events">,
    channel: "public",
  });
  const sendMessage = useMutation(api.chat.send);
  const removeMessage = useMutation(api.chat.remove);
  const toggleReactionMutation = useMutation(api.chat.toggleReaction);

  const messages: ChatMessage[] = useMemo(() => {
    if (convexMessages === undefined) {
      // Loading — utiliser l'initial render du serveur
      return initialMessages || [];
    }
    return (convexMessages as ConvexMessage[]).map(mapConvexMessage);
  }, [convexMessages, initialMessages]);

  const isLoading = convexMessages === undefined;
  const activeSenders = useMemo(() => {
    const set = new Set<string>();
    for (const m of messages) set.add(m.senderName);
    return set.size;
  }, [messages]);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => scrollToBottom(false));
      setUnreadCount(0);
      setLastSeenCount(messages.length);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(true);
    }
  }, [messages.length, isOpen, scrollToBottom]);

  // Track unread when closed
  useEffect(() => {
    if (!isOpen && messages.length > lastSeenCount) {
      setUnreadCount(messages.length - lastSeenCount);
    }
  }, [messages.length, isOpen, lastSeenCount]);

  // Plus de polling — Convex useQuery fournit les mises a jour en temps reel automatiquement.

  // Escape pour fermer le panel
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // ─── Send ──────────────────────────────────────

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !name.trim()) return;
    // Garde-fou : seul un invite avec token peut poster (UI deja verrouillee sinon)
    if (!inviteToken) return;
    setSending(true);
    setSendError(null);

    try {
      await sendMessage({
        eventId: eventId as Id<"events">,
        channel: "public",
        content: trimmed,
        replyToId: replyingTo?.id ? (replyingTo.id as Id<"chatMessages">) : undefined,
        inviteToken,
      });
      setText("");
      setReplyingTo(null);
      inputRef.current?.focus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Envoi echoue";
      setSendError(msg);
      setTimeout(() => setSendError(null), 4000);
    } finally {
      setSending(false);
    }
  }

  // ─── Reactions ─────────────────────────────────

  async function handleReaction(messageId: string, emoji: string) {
    if (!name.trim()) return;
    setActiveReactionId(null);
    try {
      await toggleReactionMutation({
        messageId: messageId as Id<"chatMessages">,
        emoji,
      });
    } catch {
      // Convex re-subscribera avec les bonnes donnees au prochain update
    }
  }

  // ─── Delete ────────────────────────────────────

  async function handleDelete(messageId: string) {
    try {
      await removeMessage({
        messageId: messageId as Id<"chatMessages">,
        inviteToken: inviteToken || undefined,
        email: organizerEmail || undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Suppression echouee";
      setSendError(msg);
      setTimeout(() => setSendError(null), 4000);
    }
  }

  // ─── Helpers ───────────────────────────────────

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  const isOwnMessage = (msg: ChatMessage) =>
    nameConfirmed && msg.senderName.toLowerCase() === name.toLowerCase();

  const stopPropagation = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  // ─── Render ────────────────────────────────────

  return (
    <div
      onTouchStart={stopPropagation}
      onTouchEnd={stopPropagation}
      onTouchMove={stopPropagation}
      onClick={stopPropagation}
      className="contents"
    >
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="fixed bottom-6 right-6 z-[999] flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95"
          style={{
            backgroundColor: colors.primary,
            color: "#fff",
            boxShadow: `0 8px 32px ${colors.primary}60`,
          }}
          aria-label="Ouvrir le chat"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold animate-bounce"
              style={{ backgroundColor: "#ef4444", color: "#fff" }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Panel — takes full screen on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[999] flex flex-col overflow-hidden"
          style={{
            backgroundColor: colors.background,
            fontFamily: `'${fontBody}', sans-serif`,
          }}
        >
          {/* ─── Header ─── */}
          <div
            className="flex items-center gap-3 px-5 py-4 relative overflow-hidden shrink-0"
            style={{
              backgroundColor: colors.primary,
              color: "#fff",
              paddingTop: "max(1rem, env(safe-area-inset-top, 16px))",
            }}
          >
            {/* Decorative gradient overlay */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: `linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)`,
              }}
            />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-lg">
              💬
            </div>
            <div className="relative flex-1 min-w-0">
              <p className="text-sm font-bold">Salon des invités</p>
              <p className="text-[11px] opacity-75 flex items-center gap-1.5">
                {activeSenders > 0 && (
                  <>
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    {activeSenders} participant{activeSenders > 1 ? "s" : ""} actif{activeSenders > 1 ? "s" : ""}
                    <span className="opacity-50"> · </span>
                  </>
                )}
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </p>
            </div>
            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Fermer le chat"
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ─── Bandeau identite (auto) ─── */}
          {canPost && autoName && (
            <div
              className="px-4 py-2 flex items-center gap-2 shrink-0"
              style={{
                backgroundColor: colors.primary + "08",
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white shrink-0"
                style={{ backgroundColor: hashColor(autoName) }}
              >
                {getInitials(autoName)}
              </div>
              <div className="flex-1 min-w-0 leading-tight">
                <p className="text-xs font-semibold truncate" style={{ color: colors.text }}>
                  {autoName}
                </p>
                <p className="text-[10px]" style={{ color: colors.muted }}>
                  Vous participez en tant que {autoName}
                </p>
              </div>
            </div>
          )}

          {/* ─── Messages ─── */}
          <div
            ref={containerRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Messages du salon"
            className="flex-1 overflow-y-auto px-3.5 py-3 space-y-1"
            style={{ backgroundColor: colors.surface + "80" }}
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full opacity-60">
                <div
                  className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
                  style={{
                    borderColor: `${colors.primary} transparent ${colors.primary} ${colors.primary}`,
                  }}
                />
                <p className="text-xs mt-3" style={{ color: colors.muted }}>
                  Chargement des messages...
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-60">
                <span className="text-4xl mb-3" aria-hidden="true">💬</span>
                <p className="text-sm font-medium" style={{ color: colors.text }}>
                  Soyez le premier à écrire !
                </p>
                <p className="text-xs mt-1 text-center max-w-[220px]" style={{ color: colors.muted }}>
                  Partagez vos messages, vœux et émotions avec tous les invités
                </p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const showDate = i === 0 || formatDate(msg.sentAt) !== formatDate(messages[i - 1].sentAt);
                const isOwn = isOwnMessage(msg);
                const isOrganizer = msg.senderRole === "ORGANIZER";
                const showAvatar = i === 0 || messages[i - 1].senderName !== msg.senderName;
                const avatarColor = hashColor(msg.senderName);
                const reactions = msg.reactions || {};
                const reactionEntries = Object.entries(reactions).filter(([, count]) => count > 0);
                const canDelete = isOwn || !!organizerEmail;

                return (
                  <article key={msg.id} role="article" aria-label={`Message de ${msg.senderName}`}>
                    {/* Date divider */}
                    {showDate && (
                      <div className="flex justify-center my-3">
                        <span
                          className="text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full"
                          style={{
                            backgroundColor: colors.primary + "12",
                            color: colors.muted,
                          }}
                        >
                          {formatDate(msg.sentAt)}
                        </span>
                      </div>
                    )}

                    {/* Message row */}
                    <div
                      className={`flex items-end gap-2 group ${isOwn ? "flex-row-reverse" : "flex-row"} ${showAvatar ? "mt-3" : "mt-0.5"}`}
                    >
                      {/* Avatar */}
                      <div className="w-7 shrink-0">
                        {showAvatar && !isOwn && (
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {getInitials(msg.senderName)}
                          </div>
                        )}
                      </div>

                      {/* Bubble */}
                      <div className={`max-w-[75%] min-w-[100px] relative ${isOwn ? "items-end" : "items-start"}`}>
                        {/* Name + Badge */}
                        {showAvatar && !isOwn && (
                          <div className="flex items-center gap-1.5 mb-0.5 ml-1">
                            <span className="text-[11px] font-semibold" style={{ color: avatarColor }}>
                              {msg.senderName}
                            </span>
                            {isOrganizer && (
                              <span
                                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                style={{
                                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                                  color: "#fff",
                                }}
                              >
                                Organisateur
                              </span>
                            )}
                          </div>
                        )}

                        <div
                          className={`relative rounded-2xl px-3.5 py-2 shadow-sm transition-all ${
                            isOwn ? "rounded-br-md" : "rounded-bl-md"
                          }`}
                          style={{
                            backgroundColor: isOwn
                              ? colors.primary
                              : isOrganizer
                                ? colors.primary + "15"
                                : colors.background,
                            color: isOwn ? "#fff" : colors.text,
                            border: isOwn ? "none" : `1px solid ${colors.border}`,
                          }}
                          onDoubleClick={() => {
                            if (nameConfirmed) setActiveReactionId(activeReactionId === msg.id ? null : msg.id);
                          }}
                        >
                          {/* Reply preview */}
                          {msg.replyTo && (
                            <div
                              className="mb-1.5 px-2.5 py-1.5 rounded-lg text-[11px] border-l-2"
                              style={{
                                backgroundColor: isOwn ? "rgba(255,255,255,0.15)" : colors.surface,
                                borderLeftColor: isOwn ? "rgba(255,255,255,0.5)" : colors.primary,
                              }}
                            >
                              <p className="font-semibold opacity-80" style={{ fontSize: "10px" }}>
                                {msg.replyTo.senderName}
                              </p>
                              <p className="opacity-70 truncate">{msg.replyTo.content}</p>
                            </div>
                          )}

                          <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                            {renderWithLinks(msg.text)}
                          </p>

                          <p
                            className={`text-[10px] mt-1 text-right ${isOwn ? "opacity-60" : ""}`}
                            style={{ color: isOwn ? "rgba(255,255,255,0.7)" : colors.muted }}
                          >
                            {formatTime(msg.sentAt)}
                          </p>

                          {/* Actions (hover) : repondre + supprimer */}
                          <div
                            className={`absolute top-1 ${isOwn ? "left-0 -translate-x-full" : "right-0 translate-x-full"} opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex gap-1 px-1`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReplyingTo(msg);
                                inputRef.current?.focus();
                              }}
                              className="text-xs p-1 hover:bg-black/5 rounded"
                              title="Répondre"
                              aria-label="Répondre à ce message"
                            >
                              <span style={{ color: colors.muted }}>↩️</span>
                            </button>
                            {canDelete && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Supprimer ce message ?")) handleDelete(msg.id);
                                }}
                                className="text-xs p-1 hover:bg-red-500/10 rounded"
                                title={isOwn ? "Supprimer mon message" : "Supprimer (modération)"}
                                aria-label="Supprimer ce message"
                              >
                                <span style={{ color: "#ef4444" }}>🗑️</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Reactions display */}
                        {reactionEntries.length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"} ml-1`}>
                            {reactionEntries.map(([emoji, count]) => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg.id, emoji)}
                                className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] transition hover:scale-110"
                                style={{
                                  backgroundColor: colors.surface,
                                  border: `1px solid ${colors.border}`,
                                }}
                                aria-label={`${count} réaction${count > 1 ? "s" : ""} ${emoji}`}
                              >
                                <span>{emoji}</span>
                                <span style={{ color: colors.muted, fontSize: "10px" }}>{count}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Quick reaction picker */}
                        {activeReactionId === msg.id && (
                          <div
                            className={`absolute ${isOwn ? "right-0" : "left-0"} -top-10 z-20 flex gap-1 rounded-full px-2 py-1.5 shadow-xl animate-scale-up`}
                            style={{
                              backgroundColor: colors.background,
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            {QUICK_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg.id, emoji)}
                                className="text-lg hover:scale-125 transition-transform active:scale-95 px-0.5"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ─── Reply Preview ─── */}
          {replyingTo && (
            <div
              className="px-4 py-2 flex items-center gap-2"
              style={{
                backgroundColor: colors.primary + "08",
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <div
                className="flex-1 min-w-0 rounded-lg px-3 py-1.5 border-l-2 text-[11px]"
                style={{
                  backgroundColor: colors.surface,
                  borderLeftColor: colors.primary,
                }}
              >
                <p className="font-semibold" style={{ color: colors.primary, fontSize: "10px" }}>
                  ↩️ {replyingTo.senderName}
                </p>
                <p className="truncate" style={{ color: colors.muted }}>
                  {replyingTo.text}
                </p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                aria-label="Annuler la réponse"
                className="shrink-0 p-1 rounded-full hover:bg-gray-200/20 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke={colors.muted}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* ─── Input ─── */}
          <div
            className="px-4 py-3 shrink-0"
            style={{
              borderTop: `1px solid ${colors.border}`,
              backgroundColor: colors.background,
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 12px))",
            }}
          >
            {!canPost ? (
              <div className="rounded-xl px-3 py-3 text-center space-y-1"
                   style={{ backgroundColor: colors.primary + "10", border: `1px solid ${colors.primary}30` }}>
                <p className="text-xs font-semibold" style={{ color: colors.primary }}>
                  🔒 Rejoindre le salon
                </p>
                <p className="text-[11px] leading-snug" style={{ color: colors.muted }}>
                  Confirmez votre présence à l&apos;événement pour participer à la discussion.
                </p>
              </div>
            ) : nameConfirmed ? (
              <div className="space-y-2">
                {sendError && (
                  <div
                    role="alert"
                    className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-[11px] text-red-600 dark:text-red-400"
                  >
                    {sendError}
                  </div>
                )}
                <form onSubmit={handleSend} className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        // Enter = envoi, Shift+Enter = nouvelle ligne
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Écrire un message... (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
                      maxLength={500}
                      rows={1}
                      aria-label="Composer un message"
                      className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition pr-10 resize-none"
                      style={{
                        backgroundColor: colors.surface,
                        color: colors.text,
                        border: `1.5px solid ${text ? colors.primary + "40" : colors.border}`,
                        maxHeight: "120px",
                      }}
                    />
                    {text.length > 400 && (
                      <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]"
                        style={{ color: text.length > 480 ? "#ef4444" : colors.muted }}
                      >
                        {500 - text.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: colors.primary,
                      boxShadow: text.trim() ? `0 4px 12px ${colors.primary}40` : "none",
                    }}
                  >
                    {sending ? (
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </form>
                <div className="flex items-center justify-end px-1">
                  <span className="text-[10px]" style={{ color: colors.muted + "80" }}>
                    Double-clic sur un message pour réagir · Entrée pour envoyer
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Close reaction picker on outside click */}
      {activeReactionId && (
        <div
          className="fixed inset-0 z-[998]"
          onClick={() => setActiveReactionId(null)}
        />
      )}

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes scaleUp {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scaleUp 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}
