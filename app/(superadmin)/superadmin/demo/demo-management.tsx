"use client";

import { useState } from "react";

interface DemoUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  plan: string;
  demoAccountType: string | null;
  eventCount: number;
  createdAt: string;
}

interface DemoEvent {
  id: string;
  title: string;
  slug: string;
  type: string;
  guestCount: number;
  status: string;
}

interface DemoAccount {
  key: string;
  label: string;
  icon: string;
  email: string;
  plan: string;
}

interface Props {
  users: DemoUser[];
  events: DemoEvent[];
  accounts: DemoAccount[];
}

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-gray-500/20 text-gray-400",
  ESSENTIEL: "bg-blue-500/20 text-blue-400",
  PREMIUM: "bg-amber-500/20 text-amber-400",
  ENTREPRISE: "bg-purple-500/20 text-purple-400",
};

export function DemoManagement({ users, events, accounts }: Props) {
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleReset = async () => {
    if (!confirm("Êtes-vous sûr de vouloir réinitialiser toutes les données démo ?")) return;

    setResetting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage(`✅ Réinitialisé: ${data.data.deletedGuests} invités, ${data.data.deletedRsvps} RSVPs, ${data.data.deletedChat} messages supprimés.`);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch {
      setMessage("❌ Erreur de connexion.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-[#30363D] bg-[#161B22] p-4 text-center">
          <p className="text-2xl font-bold text-white">{users.length}</p>
          <p className="text-xs text-[#8B949E]">Comptes démo</p>
        </div>
        <div className="rounded-lg border border-[#30363D] bg-[#161B22] p-4 text-center">
          <p className="text-2xl font-bold text-white">{events.length}</p>
          <p className="text-xs text-[#8B949E]">Événements démo</p>
        </div>
        <div className="rounded-lg border border-[#30363D] bg-[#161B22] p-4 text-center">
          <p className="text-2xl font-bold text-white">
            {events.reduce((a, b) => a + b.guestCount, 0)}
          </p>
          <p className="text-xs text-[#8B949E]">Invités démo total</p>
        </div>
        <div className="rounded-lg border border-[#30363D] bg-[#161B22] p-4 text-center">
          <p className="text-2xl font-bold text-white">demo1234</p>
          <p className="text-xs text-[#8B949E]">Mot de passe commun</p>
        </div>
      </div>

      {/* Reset action */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-red-400">
              Réinitialiser les données démo
            </h3>
            <p className="mt-1 text-xs text-[#8B949E]">
              Supprime tous les invités, RSVP, messages chat des événements démo.
              Relancez <code className="rounded bg-[#21262D] px-1">npx tsx prisma/seed-demo.ts</code> après.
            </p>
          </div>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="shrink-0 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
          >
            {resetting ? "Réinitialisation..." : "Réinitialiser"}
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-[#8B949E]">{message}</p>}
      </div>

      {/* Demo accounts list */}
      <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Comptes de démonstration
        </h3>
        <div className="space-y-2">
          {users.map((user) => {
            const account = accounts.find((a) => a.email === user.email);
            return (
              <div
                key={user.id}
                className="flex items-center gap-4 rounded-lg bg-[#0F1117] p-3"
              >
                <span className="text-xl">{account?.icon || "👤"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#E6EDF3]">
                    {account?.label || user.name || "—"}
                  </p>
                  <p className="text-xs text-[#484F58]">{user.email}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PLAN_COLORS[user.plan]}`}
                >
                  {user.plan}
                </span>
                <span className="text-xs text-[#484F58]">
                  {user.role}
                </span>
                <span className="text-xs text-[#484F58]">
                  {user.eventCount} evt
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Demo events */}
      <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Événements de démonstration
        </h3>
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between rounded-lg bg-[#0F1117] p-3"
            >
              <div>
                <p className="text-sm font-medium text-[#E6EDF3]">
                  {event.title}
                </p>
                <p className="text-xs text-[#484F58]">
                  /{event.slug} · {event.type}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#8B949E]">
                  {event.guestCount} invités
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    event.status === "PUBLISHED"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {event.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
