"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

// ─── Types ──────────────────────────────────────────────────

interface EventData {
  slug: string;
  title: string;
  type: string;
  date: string;
  location: string | null;
  description: string | null;
  totalGuests: number;
  confirmed: number;
  declined: number;
  rsvpRate: number;
  activeModules: string[];
  typeConfig: { label: string; icon: string; color: string; description: string };
  moduleIcons: { type: string; icon: string; label: string }[];
  extraModules: number;
}

interface AccountData {
  key: string;
  email: string;
  name: string;
  plan: string;
  role: string;
  label: string;
  icon: string;
  description: string;
  redirectUrl: string;
}

interface Props {
  events: EventData[];
  accounts: AccountData[];
}

// ─── Animated Counter ───────────────────────────────────────

function AnimatedCounter({ target, suffix = "" }: { target: number | string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (typeof target !== "number") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1500;
          const steps = 40;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  if (typeof target !== "number") {
    return <span className="text-4xl font-bold">{target}</span>;
  }

  return (
    <span ref={ref} className="text-4xl font-bold tabular-nums">
      {count}
      {suffix}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────

export function DemoClientSection({ events, accounts }: Props) {
  const [loginLoading, setLoginLoading] = useState<string | null>(null);
  const [particles, setParticles] = useState<
    { width: string; height: string; left: string; top: string; animationDelay: string; animationDuration: string }[]
  >([]);

  // Generate particle styles only on the client to avoid hydration mismatch
  useEffect(() => {
    setParticles(
      Array.from({ length: 30 }).map(() => ({
        width: `${2 + Math.random() * 4}px`,
        height: `${2 + Math.random() * 4}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${3 + Math.random() * 4}s`,
      }))
    );
  }, []);

  const handleDemoLogin = async (account: AccountData) => {
    setLoginLoading(account.key);
    try {
      const res = await fetch("/api/demo/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountType: account.key }),
      });
      const data = await res.json();

      if (data.success) {
        // Sign in using NextAuth credentials provider
        const result = await signIn("credentials", {
          email: data.data.email,
          password: data.data.password,
          redirect: false,
        });

        if (result?.ok) {
          window.location.href = data.data.redirectUrl;
        } else {
          alert("Erreur de connexion. Les données démo sont peut-être non initialisées.");
        }
      } else {
        alert(data.error || "Erreur de connexion démo.");
      }
    } catch {
      alert("Erreur de connexion au serveur.");
    } finally {
      setLoginLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const planColors: Record<string, string> = {
    FREE: "bg-gray-500/10 text-gray-600",
    ESSENTIEL: "bg-blue-500/10 text-blue-600",
    PREMIUM: "bg-amber-500/10 text-amber-700",
    ENTREPRISE: "bg-purple-500/10 text-purple-600",
  };

  return (
    <div className="min-h-screen bg-[#0c0a1a]">
      {/* ─── HERO ────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c0a1a] via-[#1a1035] to-[#2d1548]" />

        {/* Particle dots (client-only to avoid hydration mismatch) */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          {particles.map((style, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/[0.03] animate-pulse"
              style={style}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 py-20 sm:py-28 text-center">
          {/* Animated badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm font-medium text-white/70">
              Démo en direct · Données réinitialisées chaque nuit
            </span>
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Découvrez{" "}
            <span className="bg-gradient-to-r from-[#C48B90] via-[#E8734A] to-[#C9A96E] bg-clip-text text-transparent">
              EventFlow
            </span>{" "}
            en action
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-white/60 leading-relaxed">
            Explorez de vraies pages d&apos;invitation, testez chaque fonctionnalité,
            connectez-vous sur un compte de démonstration.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#events"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7A3A50] to-[#C48B90] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-900/30 transition-all hover:shadow-xl hover:shadow-pink-900/40 hover:-translate-y-0.5"
            >
              Explorer les événements ↓
            </a>
            <a
              href="#accounts"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 backdrop-blur-sm transition-all hover:bg-white/10"
            >
              Se connecter en démo
            </a>
          </div>
        </div>
      </section>

      {/* ─── EVENTS GRID ─────────────────────────────────── */}
      <section id="events" className="relative bg-[#0e0c1e] py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">
              Explorer les événements
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Chaque type d&apos;événement a été créé avec des données réalistes.
              Cliquez pour voir la carte d&apos;invitation ou accéder au tableau de bord.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event, eventIndex) => {
              const isFeatured = eventIndex === 0;
              return (
              <div
                key={event.slug}
                className={`group relative rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                  isFeatured
                    ? "sm:col-span-2 lg:col-span-2 border-[#C9A96E]/30 bg-gradient-to-br from-[#8B5C6E]/40 via-[#8B5C6E]/20 to-[#C48B90]/10 hover:border-[#C9A96E]/50 hover:shadow-[#8B5C6E]/20"
                    : "border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent hover:border-white/[0.12] hover:bg-white/[0.06] hover:shadow-purple-900/10"
                }`}
              >
                {/* Type & status badges */}
                <div className="flex items-center gap-2 mb-4">
                  {isFeatured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#C9A96E]/15 px-2.5 py-0.5 text-xs font-bold text-[#C9A96E] tracking-wide">
                      ✦ ÉVÉNEMENT VITRINE
                    </span>
                  )}
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: event.typeConfig.color + "15",
                      color: event.typeConfig.color,
                    }}
                  >
                    {event.typeConfig.icon} {event.typeConfig.label}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Publié
                  </span>
                </div>

                {/* Title */}
                <h3 className={`font-bold text-white mb-2 group-hover:text-white/90 ${isFeatured ? "text-xl lg:text-2xl" : "text-lg"}`}>
                  {event.title}
                </h3>

                {/* Subtitle for featured */}
                {isFeatured && (
                  <p className="text-sm text-[#C9A96E]/80 font-medium mb-3 italic" style={{ fontFamily: "Georgia, serif" }}>
                    Rose d&apos;Automne &amp; l&apos;Élégance Royale
                  </p>
                )}

                {/* Date & Location */}
                <div className="flex flex-col gap-1 text-sm text-white/40 mb-4">
                  <span>📅 {formatDate(event.date)}</span>
                  {event.location && <span className="truncate">📍 {event.location}</span>}
                </div>

                {/* Stats bar */}
                <div className="flex items-center gap-4 text-xs text-white/50 mb-3">
                  <span>👥 {event.totalGuests}</span>
                  <span className="text-emerald-400">✓ {event.confirmed}</span>
                  {isFeatured && <span className="text-amber-400/70">⏳ {event.totalGuests - event.confirmed - event.declined}</span>}
                  <span>📊 {event.rsvpRate}%</span>
                </div>

                {/* RSVP Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-white/[0.06] mb-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      isFeatured
                        ? "bg-gradient-to-r from-[#C9A96E] to-[#C48B90]"
                        : "bg-gradient-to-r from-emerald-500 to-emerald-400"
                    }`}
                    style={{ width: `${event.rsvpRate}%` }}
                  />
                </div>

                {/* Module icons */}
                <div className="flex items-center gap-1.5 mb-5">
                  {event.moduleIcons.map((mod) => (
                    <span
                      key={mod.type}
                      title={mod.label}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05] text-xs"
                    >
                      {mod.icon}
                    </span>
                  ))}
                  {event.extraModules > 0 && (
                    <span className="text-xs text-white/30">
                      +{event.extraModules}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className={`flex gap-2 ${isFeatured ? "flex-row" : "flex-col"}`}>
                  <Link
                    href={`/${event.slug}`}
                    target="_blank"
                    className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      isFeatured
                        ? "flex-1 bg-gradient-to-r from-[#8B5C6E] to-[#C48B90] text-white hover:shadow-lg hover:shadow-[#8B5C6E]/30"
                        : "border border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {isFeatured ? "🌹 Voir la carte d'invitation" : "Voir la carte d'invitation →"}
                  </Link>
                </div>

                {/* Featured disclaimer */}
                {isFeatured && (
                  <p className="mt-4 text-[10px] text-white/20 text-center">
                    Données de démonstration · Événement fictif basé sur un cas réel
                  </p>
                )}
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── TEST ACCOUNTS ───────────────────────────────── */}
      <section id="accounts" className="relative bg-[#0c0a1a] py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">
              Testez chaque rôle
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Connectez-vous instantanément sur un compte de démonstration pour
              explorer le tableau de bord, gérer les invités, ou voir la carte d&apos;invitation.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {accounts.map((account) => (
              <div
                key={account.key}
                className="group rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.05]"
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{account.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{account.label}</p>
                    <span
                      className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${planColors[account.plan] || "bg-gray-500/10 text-gray-400"}`}
                    >
                      {account.plan}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-white/40 mb-4 leading-relaxed">
                  {account.description}
                </p>

                {/* Credentials */}
                <div className="mb-4 space-y-1.5 rounded-lg bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-white/30">Email</span>
                    <button
                      onClick={() => copyToClipboard(account.email)}
                      className="text-[10px] text-white/20 hover:text-white/50 transition-colors"
                      title="Copier"
                    >
                      📋
                    </button>
                  </div>
                  <p className="text-xs font-mono text-white/60 truncate">{account.email}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-white/30">Mot de passe</span>
                    <button
                      onClick={() => copyToClipboard("demo1234")}
                      className="text-[10px] text-white/20 hover:text-white/50 transition-colors"
                      title="Copier"
                    >
                      📋
                    </button>
                  </div>
                  <p className="text-xs font-mono text-white/60">demo1234</p>
                </div>

                {/* Login button */}
                <button
                  onClick={() => handleDemoLogin(account)}
                  disabled={loginLoading !== null}
                  className="w-full rounded-lg bg-gradient-to-r from-[#7A3A50] to-[#C48B90] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-pink-900/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {loginLoading === account.key ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Connexion...
                    </span>
                  ) : (
                    "Se connecter instantanément →"
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES IN NUMBERS ─────────────────────────── */}
      <section className="relative bg-[#0e0c1e] py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">
              Fonctionnalités en chiffres
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { value: 9, label: "Modules configurables", suffix: "" },
              { value: 6, label: "Types d'événements", suffix: "" },
              { value: 4, label: "Plans disponibles", suffix: "" },
              { value: "∞", label: "Invités (Entreprise)", suffix: "" },
            ].map((stat, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center"
              >
                <div className="text-[#C48B90]">
                  <AnimatedCounter
                    target={stat.value as number}
                    suffix={stat.suffix}
                  />
                </div>
                <p className="mt-2 text-sm text-white/40">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────────── */}
      <section className="relative bg-[#0c0a1a] py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">
              Comment ça marche
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              De la création à la gestion, en 4 étapes simples.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "✦", title: "Créer votre événement", desc: "Choisissez un type, personnalisez les détails, sélectionnez vos modules." },
              { icon: "🎨", title: "Personnaliser la carte", desc: "Thèmes prédéfinis, effets visuels, palette de couleurs sur-mesure." },
              { icon: "📨", title: "Inviter vos proches", desc: "Ajoutez vos invités, envoyez les invitations, suivez les RSVP." },
              { icon: "📊", title: "Gérer en temps réel", desc: "Dashboard complet, QR codes, chat, statistiques en direct." },
            ].map((step, i) => (
              <div key={i} className="relative group text-center">
                {/* Step number */}
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7A3A50]/20 to-[#C48B90]/20 text-2xl transition-transform group-hover:scale-110">
                  {step.icon}
                </div>

                {/* Connector line */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-7 left-[calc(50%+28px)] w-[calc(100%-56px)] h-px bg-gradient-to-r from-white/10 to-transparent" />
                )}

                <h3 className="mb-2 text-base font-bold text-white">
                  <span className="mr-1 text-[#C48B90]">{i + 1}.</span>
                  {step.title}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MOBILE PREVIEW ──────────────────────────────── */}
      <section className="relative bg-[#0e0c1e] py-20 overflow-hidden">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">
            Aperçu mobile
          </h2>
          <p className="text-white/50 max-w-md mx-auto mb-10">
            Vos cartes d&apos;invitation s&apos;adaptent parfaitement à tous les écrans.
          </p>

          {/* Phone mockup */}
          <div className="mx-auto" style={{ width: 280, perspective: "1000px" }}>
            <div
              className="relative rounded-[2rem] border-2 border-white/10 bg-[#1a1830] p-3 shadow-2xl shadow-purple-900/20"
              style={{
                animation: "float 6s ease-in-out infinite",
              }}
            >
              {/* Notch */}
              <div className="mx-auto mb-2 h-5 w-24 rounded-full bg-black/40" />

              {/* Screen */}
              <div className="rounded-2xl bg-gradient-to-b from-[#FFFDF9] to-[#F8F0EB] p-4 aspect-[9/16] flex flex-col items-center justify-center text-center overflow-hidden">
                <div className="text-3xl mb-3">💍</div>
                <p className="text-[10px] font-medium text-[#9B8A8E] tracking-[0.2em] uppercase mb-1">
                  Vous êtes invités au mariage de
                </p>
                <h3 className="text-xl font-serif text-[#3D2428] font-bold mb-2" style={{ fontFamily: "Georgia, serif" }}>
                  Sophie & Marc
                </h3>
                <div className="w-12 h-px bg-[#C9A96E] mb-2" />
                <p className="text-[9px] text-[#9B8A8E]">
                  15 Juin 2026 · Château de Versailles-sur-Loire
                </p>
                <div className="mt-4 rounded-lg bg-[#8B5A6A]/10 px-3 py-1.5 text-[9px] font-medium text-[#8B5A6A]">
                  Confirmer ma présence
                </div>
              </div>

              {/* Home bar */}
              <div className="mx-auto mt-2 h-1 w-20 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────── */}
      <footer className="bg-[#0c0a1a] border-t border-white/[0.05] py-12">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
            <Link
              href="/"
              className="text-sm font-medium text-white/40 hover:text-white/70 transition-colors"
            >
              ← Page d&apos;accueil
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7A3A50] to-[#C48B90] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-900/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              Créer un vrai compte →
            </Link>
          </div>
          <p className="text-xs text-white/20">
            Ces données sont fictives et réinitialisées toutes les 24h · EventFlow © 2026
          </p>
        </div>
      </footer>

      {/* ─── Float Animation ─────────────────────────────── */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(-1deg);
          }
          50% {
            transform: translateY(-12px) rotate(1deg);
          }
        }
      `}</style>
    </div>
  );
}
