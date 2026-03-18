"use client";

import { useState, useRef, useEffect, useCallback } from "react";

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
  reactions: Record<string, string[]>;
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
  guestName?: string;
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
}: ChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || []);
  const [name, setName] = useState(guestName || "");
  const [nameConfirmed, setNameConfirmed] = useState(!!guestName);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
  const [activeSenders, setActiveSenders] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenCount, setLastSeenCount] = useState(initialMessages?.length || 0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Poll for new messages
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/chat`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setMessages(data.data);
            setActiveSenders(data.meta?.activeSenders || 0);
          }
        }
      } catch { /* silent */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen, eventId]);

  // ─── Send ──────────────────────────────────────

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !name.trim()) return;
    setSending(true);

    try {
      const res = await fetch(`/api/events/${eventId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: name.trim(),
          text: text.trim(),
          replyToId: replyingTo?.id || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMessages((prev) => [...prev, data.data]);
          setText("");
          setReplyingTo(null);
          setNameConfirmed(true);
          setLastSeenCount((prev) => prev + 1);
          inputRef.current?.focus();
        }
      }
    } catch { /* silent */ }
    setSending(false);
  }

  // ─── Reactions ─────────────────────────────────

  async function handleReaction(messageId: string, emoji: string) {
    if (!name.trim()) return;
    setActiveReactionId(null);

    try {
      const res = await fetch(`/api/events/${eventId}/chat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          emoji,
          senderName: name.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, reactions: data.data.reactions } : m
            )
          );
        }
      }
    } catch { /* silent */ }
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
    >
      {/* ═══ Floating Button ═══ */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          backgroundColor: colors.primary,
          color: "#fff",
          boxShadow: `0 8px 32px ${colors.primary}60`,
        }}
        aria-label="Ouvrir le chat"
      >
        {isOpen ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
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
          </>
        )}
      </button>

      {/* Pulse ring */}
      {!isOpen && unreadCount > 0 && (
        <div
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full animate-ping opacity-20"
          style={{ backgroundColor: colors.primary }}
        />
      )}

      {/* ═══ Chat Panel ═══ */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col overflow-hidden rounded-2xl shadow-2xl"
          style={{
            width: "min(400px, calc(100vw - 32px))",
            height: "min(560px, 75vh)",
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            fontFamily: `'${fontBody}', sans-serif`,
            boxShadow: `0 25px 60px -12px rgba(0,0,0,0.25), 0 0 0 1px ${colors.border}`,
          }}
        >
          {/* ─── Header ─── */}
          <div
            className="flex items-center gap-3 px-5 py-4 relative overflow-hidden"
            style={{ backgroundColor: colors.primary, color: "#fff" }}
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
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ─── Name Entry ─── */}
          {!nameConfirmed && (
            <div
              className="px-4 py-3 flex items-center gap-2"
              style={{
                backgroundColor: colors.primary + "08",
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0"
                style={{ backgroundColor: colors.primary + "20", color: colors.primary }}
              >
                {name ? getInitials(name) : "?"}
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) {
                    setNameConfirmed(true);
                    inputRef.current?.focus();
                  }
                }}
                placeholder="Votre prénom pour rejoindre..."
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition"
                style={{
                  backgroundColor: colors.surface,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                }}
              />
              {name.trim() && (
                <button
                  onClick={() => { setNameConfirmed(true); inputRef.current?.focus(); }}
                  className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: colors.primary }}
                >
                  Rejoindre
                </button>
              )}
            </div>
          )}

          {/* ─── Messages ─── */}
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto px-3.5 py-3 space-y-1"
            style={{ backgroundColor: colors.surface + "80" }}
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-60">
                <span className="text-4xl mb-3">💬</span>
                <p className="text-sm font-medium" style={{ color: colors.text }}>
                  Bienvenue dans le salon !
                </p>
                <p className="text-xs mt-1 text-center max-w-[200px]" style={{ color: colors.muted }}>
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
                const reactionEntries = Object.entries(reactions).filter(
                  ([, users]) => (users as string[]).length > 0
                );

                return (
                  <div key={msg.id}>
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
                            {msg.text}
                          </p>

                          <p
                            className={`text-[10px] mt-1 text-right ${isOwn ? "opacity-60" : ""}`}
                            style={{ color: isOwn ? "rgba(255,255,255,0.7)" : colors.muted }}
                          >
                            {formatTime(msg.sentAt)}
                          </p>

                          {/* Reply button (hover) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReplyingTo(msg);
                              inputRef.current?.focus();
                            }}
                            className={`absolute top-1 ${isOwn ? "left-0 -translate-x-full" : "right-0 translate-x-full"} opacity-0 group-hover:opacity-100 transition-opacity px-1`}
                            title="Répondre"
                          >
                            <span className="text-xs" style={{ color: colors.muted }}>↩️</span>
                          </button>
                        </div>

                        {/* Reactions display */}
                        {reactionEntries.length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"} ml-1`}>
                            {reactionEntries.map(([emoji, users]) => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg.id, emoji)}
                                className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] transition hover:scale-110"
                                style={{
                                  backgroundColor: (users as string[]).includes(name) ? colors.primary + "20" : colors.surface,
                                  border: `1px solid ${(users as string[]).includes(name) ? colors.primary + "40" : colors.border}`,
                                }}
                                title={(users as string[]).join(", ")}
                              >
                                <span>{emoji}</span>
                                <span style={{ color: colors.muted, fontSize: "10px" }}>{(users as string[]).length}</span>
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
                  </div>
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
            className="px-4 py-3"
            style={{
              borderTop: `1px solid ${colors.border}`,
              backgroundColor: colors.background,
            }}
          >
            {nameConfirmed ? (
              <div className="space-y-2">
                <form onSubmit={handleSend} className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Écrire un message..."
                      maxLength={500}
                      className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition pr-10"
                      style={{
                        backgroundColor: colors.surface,
                        color: colors.text,
                        border: `1.5px solid ${text ? colors.primary + "40" : colors.border}`,
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
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={() => { setNameConfirmed(false); }}
                    className="text-[10px] flex items-center gap-1 hover:underline transition"
                    style={{ color: colors.muted }}
                  >
                    <span
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white"
                      style={{ backgroundColor: hashColor(name) }}
                    >
                      {getInitials(name)}
                    </span>
                    {name}
                  </button>
                  <span className="text-[10px]" style={{ color: colors.muted + "80" }}>
                    Double-clic = réagir
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs" style={{ color: colors.muted }}>
                  Entrez votre nom ci-dessus pour envoyer un message
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Close reaction picker on outside click */}
      {activeReactionId && (
        <div
          className="fixed inset-0 z-40"
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
