"use client";

import { useState, useEffect, useRef } from "react";

interface ChatMessage {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface EventChatProps {
  eventId: string;
  currentUserId: string;
}

export function EventChat({ eventId, currentUserId }: EventChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/events/${eventId}/chat`);
        const data = await res.json();
        if (data.success) {
          setMessages(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMessages();

    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [eventId]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.data]);
        setInput("");
      }
    } catch (err) {
      console.error("Failed to send:", err);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm" style={{ height: "500px" }}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <span className="text-lg">💬</span>
        <h3 className="text-sm font-semibold text-gray-900">Chat interne</h3>
        <span className="text-xs text-gray-400">#{" "}général</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#7A3A50] border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="text-3xl">💬</span>
            <p className="mt-2 text-sm text-gray-500">Aucun message encore</p>
            <p className="text-xs text-gray-400">Commencez la conversation !</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user.id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: isOwn ? "#7A3A50" : "#6B7280" }}
                >
                  {msg.user.name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-gray-700">
                      {msg.user.name || "Anonyme"}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    className={`mt-0.5 inline-block rounded-xl px-3 py-1.5 text-sm ${
                      isOwn
                        ? "bg-[#7A3A50] text-white rounded-tr-none"
                        : "bg-gray-100 text-gray-800 rounded-tl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-gray-100 px-4 py-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Votre message..."
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="rounded-lg bg-[#7A3A50] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6A2A40] disabled:opacity-50"
        >
          {isSending ? "..." : "Envoyer"}
        </button>
      </form>
    </div>
  );
}
