"use client";

import { useEffect, useState, useCallback, type CSSProperties } from "react";
import { AmbientEffect } from "@/components/effects/ambient-effect";
import { RsvpForm } from "@/components/public/rsvp-form";
import { ChatBubble } from "@/components/public/chat-bubble";
import "@/public/effects/entry-effects.css";
import "@/public/effects/ambient-effects.css";

// ─── Types ──────────────────────────────────────────────────

interface ModulesData {
  programme: Record<string, unknown> | null;
  menu: Record<string, unknown> | null;
  logistics: Record<string, unknown> | null;
  chat: Record<string, unknown> | null;
  gallery: Record<string, unknown> | null;
  rsvp: Record<string, unknown> | null;
}

export interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string | null;
  inviteToken: string;
  hasRsvp: boolean;
  presence: boolean | null;
  qrToken: string | null;
}

interface InvitationCardProps {
  event: {
    id: string;
    slug: string;
    title: string;
    type: string;
    date: string;
    location: string | null;
    description: string | null;
    organizer: string | null;
    guestCount: number;
    coverImage: string | null;
    coverVideo: string | null;
  };
  theme: {
    cssVars: Record<string, string>;
    fontDisplay: string;
    fontBody: string;
    entryEffect: string;
    ambientEffect: string | null;
    ambientIntensity: number;
    scrollReveal: string;
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
  };
  activeModules: string[];
  modulesData: ModulesData;
  chatMessages: { id: string; senderName: string; senderRole: string; text: string; reactions: Record<string, string[]>; replyTo: { id: string; senderName: string; content: string } | null; sentAt: string }[];
  guestInfo?: GuestInfo | null;
}

interface PageDef {
  id: string;
  icon: string;
  label: string;
}

// ─── Countdown ──────────────────────────────────────────────

function Countdown({ targetDate, colors }: { targetDate: string; colors: InvitationCardProps["theme"]["colors"] }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!mounted) return null;

  const isPast = new Date(targetDate).getTime() <= Date.now();
  if (isPast) {
    return (
      <p className="text-base font-medium" style={{ fontFamily: "var(--font-display)", color: colors.muted }}>
        L&apos;événement a eu lieu
      </p>
    );
  }

  return (
    <div className="flex justify-center gap-3 sm:gap-5" suppressHydrationWarning>
      {[
        { value: timeLeft.days, label: "Jours" },
        { value: timeLeft.hours, label: "Heures" },
        { value: timeLeft.minutes, label: "Min" },
        { value: timeLeft.seconds, label: "Sec" },
      ].map(({ value, label }) => (
        <div
          key={label}
          className="flex flex-col items-center rounded-xl px-3 py-2"
          style={{ backgroundColor: colors.primary + "10" }}
        >
          <span
            className="text-2xl sm:text-3xl font-bold tabular-nums"
            style={{ fontFamily: "var(--font-display)", color: colors.primary }}
          >
            {String(value).padStart(2, "0")}
          </span>
          <span className="mt-0.5 text-[10px] uppercase tracking-widest" style={{ color: colors.muted }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Programme Section ──────────────────────────────────────

function ProgrammeContent({
  config,
  colors,
  fontDisplay,
}: {
  config: Record<string, unknown>;
  colors: InvitationCardProps["theme"]["colors"];
  fontDisplay: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const programme = config as any;
  const days = programme?.days || programme?.programme || [];
  const [activeDay, setActiveDay] = useState(0);

  if (!Array.isArray(days) || days.length === 0) {
    return <p style={{ color: colors.muted }}>Programme à venir...</p>;
  }

  const currentDay = days[activeDay];
  const items = currentDay?.items || currentDay?.steps || currentDay?.events || [];

  return (
    <div className="w-full">
      {/* Day selector */}
      {days.length > 1 && (
        <div className="flex gap-2 mb-4 justify-center">
          {days.map((day: { label?: string; date?: string }, i: number) => (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: activeDay === i ? colors.primary : colors.surface,
                color: activeDay === i ? "#fff" : colors.text,
                border: `1px solid ${activeDay === i ? colors.primary : colors.border}`,
              }}
            >
              {day.label || day.date || `Jour ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-0">
        {items.map((item: { time?: string; title?: string; description?: string; icon?: string }, idx: number) => (
          <div key={idx} className="flex gap-3 items-start">
            <div className="flex flex-col items-center w-14 shrink-0">
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: colors.primary }}>
                {item.time || "—"}
              </span>
              {idx < items.length - 1 && (
                <div
                  className="w-px flex-1 min-h-[30px] mt-1"
                  style={{ backgroundColor: colors.border }}
                />
              )}
            </div>
            <div
              className="flex-1 rounded-lg p-2.5 mb-2"
              style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
            >
              <div className="flex items-center gap-2">
                {item.icon && <span className="text-sm">{item.icon}</span>}
                <h4 className="text-sm font-semibold" style={{ fontFamily: `'${fontDisplay}', serif`, color: colors.text }}>
                  {item.title}
                </h4>
              </div>
              {item.description && (
                <p className="mt-1 text-xs leading-relaxed" style={{ color: colors.muted }}>
                  {item.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Menu Section ───────────────────────────────────────────

function MenuContent({
  config,
  colors,
  fontDisplay,
}: {
  config: Record<string, unknown>;
  colors: InvitationCardProps["theme"]["colors"];
  fontDisplay: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const menuConfig = config as any;
  const courses = menuConfig?.courses || menuConfig?.menu || [];

  if (!Array.isArray(courses) || courses.length === 0) {
    return <p style={{ color: colors.muted }}>Menu à venir...</p>;
  }

  return (
    <div className="w-full space-y-3">
      {courses.map((course: { name?: string; items?: string[]; icon?: string }, idx: number) => (
        <div
          key={idx}
          className="rounded-lg p-3"
          style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
        >
          <h4
            className="text-sm font-semibold mb-1.5"
            style={{ fontFamily: `'${fontDisplay}', serif`, color: colors.primary }}
          >
            {course.icon || "🍽️"} {course.name}
          </h4>
          {course.items && (
            <ul className="space-y-0.5">
              {course.items.map((item: string, i: number) => (
                <li key={i} className="text-xs flex items-center gap-1.5" style={{ color: colors.text }}>
                  <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: colors.accent }} />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Logistics Section ──────────────────────────────────────

function LogisticsContent({
  config,
  colors,
  fontDisplay,
}: {
  config: Record<string, unknown>;
  colors: InvitationCardProps["theme"]["colors"];
  fontDisplay: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logConfig = config as any;
  const sections = logConfig?.sections || logConfig?.logistics || logConfig?.items || [];

  if (!Array.isArray(sections) || sections.length === 0) {
    return <p style={{ color: colors.muted }}>Informations à venir...</p>;
  }

  return (
    <div className="w-full space-y-3">
      {sections.map((section: { title?: string; description?: string; items?: string[]; icon?: string }, idx: number) => (
        <div
          key={idx}
          className="rounded-lg p-3"
          style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
        >
          <h4
            className="text-sm font-semibold mb-1"
            style={{ fontFamily: `'${fontDisplay}', serif`, color: colors.primary }}
          >
            {section.icon || "📍"} {section.title}
          </h4>
          {section.description && (
            <p className="text-xs leading-relaxed" style={{ color: colors.text }}>
              {section.description}
            </p>
          )}
          {section.items && (
            <ul className="mt-1.5 space-y-0.5">
              {section.items.map((item: string, i: number) => (
                <li key={i} className="text-xs flex items-center gap-1.5" style={{ color: colors.muted }}>
                  <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: colors.accent }} />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Gallery Section ────────────────────────────────────────

function GalleryContent({
  config,
  colors,
}: {
  config: Record<string, unknown>;
  colors: InvitationCardProps["theme"]["colors"];
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const galConfig = config as any;
  const photos = galConfig?.photos || [];
  const [selected, setSelected] = useState<number | null>(null);

  if (!Array.isArray(photos) || photos.length === 0) {
    return <p style={{ color: colors.muted }}>Galerie à venir...</p>;
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((photo: { url?: string; caption?: string }, i: number) => (
          <button
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            className="relative overflow-hidden rounded-xl aspect-square transition-all hover:scale-[1.02]"
            style={{ border: `2px solid ${selected === i ? colors.primary : "transparent"}` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption || `Photo ${i + 1}`}
              className="w-full h-full object-cover"
            />
            {photo.caption && selected === i && (
              <div
                className="absolute inset-x-0 bottom-0 px-2 py-1.5 text-[10px]"
                style={{
                  background: `linear-gradient(transparent, ${colors.background})`,
                  color: colors.text,
                }}
              >
                {photo.caption}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Section Divider ────────────────────────────────────────

function SectionDivider({ colors }: { colors: InvitationCardProps["theme"]["colors"] }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.accent }} />
      <div className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
    </div>
  );
}

// ─── Main InvitationCard ────────────────────────────────────

export function InvitationCard({ event, theme, activeModules, modulesData, chatMessages, guestInfo }: InvitationCardProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isEntryComplete, setIsEntryComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsEntryComplete(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Lock html/body scroll
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.height = "100%";
    document.body.style.height = "100%";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.documentElement.style.height = "";
      document.body.style.height = "";
    };
  }, []);

  const entryClass = `entry-${theme.entryEffect.replace(/_/g, "-")}`;

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedTime = eventDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ═══ Build 3+1 pages ═══
  const pages: PageDef[] = [
    { id: "accueil", icon: "🏠", label: "Accueil" },
  ];

  // Page 2: L'événement (if programme or menu exists)
  const hasProgramme = activeModules.includes("MOD_PROGRAMME") && modulesData.programme;
  const hasMenu = activeModules.includes("MOD_MENU") && modulesData.menu;
  if (hasProgramme || hasMenu) {
    pages.push({ id: "evenement", icon: "📋", label: "L'événement" });
  }

  // Page 3: Infos & Moments (if logistics or gallery exists)
  const hasLogistics = activeModules.includes("MOD_LOGISTIQUE") && modulesData.logistics;
  const hasGallery = activeModules.includes("MOD_GALERIE") && modulesData.gallery;
  if (hasLogistics || hasGallery) {
    pages.push({ id: "infos", icon: "📍", label: "Infos & Moments" });
  }

  // Page 4: RSVP
  if (activeModules.includes("MOD_RSVP")) {
    pages.push({ id: "rsvp", icon: "✅", label: "Confirmation" });
  }

  const totalPages = pages.length;

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalPages) return;
      setCurrentPage(index);
    },
    [totalPages]
  );

  const goNext = useCallback(() => goTo(currentPage + 1), [goTo, currentPage]);
  const goPrev = useCallback(() => goTo(currentPage - 1), [goTo, currentPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  // Touch / swipe
  useEffect(() => {
    let startY = 0;
    let startX = 0;
    const onStart = (e: TouchEvent) => { startY = e.touches[0].clientY; startX = e.touches[0].clientX; };
    const onEnd = (e: TouchEvent) => {
      const dy = startY - e.changedTouches[0].clientY;
      const dx = startX - e.changedTouches[0].clientX;
      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy > 50) goNext();
        if (dy < -50) goPrev();
      } else {
        if (dx > 50) goNext();
        if (dx < -50) goPrev();
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [goNext, goPrev]);

  const hasChat = activeModules.includes("MOD_CHAT");
  const currentPageDef = pages[currentPage];
  const hasCoverMedia = event.coverImage || event.coverVideo;

  return (
    <div
      className={`h-screen overflow-hidden ${entryClass}`}
      style={{
        ...theme.cssVars as unknown as CSSProperties,
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: `'${theme.fontBody}', sans-serif`,
      }}
    >
      {/* Ambient Effects */}
      <AmbientEffect
        effect={theme.ambientEffect}
        intensity={theme.ambientIntensity}
        colors={{
          primary: theme.colors.primary,
          secondary: theme.colors.secondary,
          accent: theme.colors.accent,
        }}
      />

      {/* Page content */}
      <div className="relative z-10 h-full">
        <div className="h-full relative">
          {pages.map((page, index) => (
            <div
              key={page.id}
              className="absolute inset-0 flex flex-col"
              style={{
                transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: index === currentPage
                  ? "translateY(0)"
                  : index < currentPage
                    ? "translateY(-100%)"
                    : "translateY(100%)",
                opacity: index === currentPage ? 1 : 0,
                pointerEvents: index === currentPage ? "auto" : "none",
                zIndex: index === currentPage ? 1 : 0,
              }}
            >
              {/* ═══════════════ PAGE 1 — ACCUEIL ═══════════════ */}
              {page.id === "accueil" && (
                <div className="h-full relative flex flex-col items-center justify-center">
                  {/* Cover media background */}
                  {hasCoverMedia && (
                    <div className="absolute inset-0 z-0 overflow-hidden">
                      {event.coverVideo ? (
                        <video
                          src={event.coverVideo}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover"
                          style={{
                            transform: "translate(-50%, -50%)",
                            width: "auto",
                            height: "auto",
                          }}
                        />
                      ) : event.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={event.coverImage}
                          alt={event.title}
                          className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover"
                          style={{
                            transform: "translate(-50%, -50%)",
                            width: "auto",
                            height: "auto",
                          }}
                        />
                      ) : null}
                      {/* Gradient overlay for text readability */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(to bottom, ${theme.colors.background}90 0%, ${theme.colors.background}40 30%, ${theme.colors.background}60 70%, ${theme.colors.background}95 100%)`,
                        }}
                      />
                    </div>
                  )}

                  <div className="relative z-10 text-center max-w-2xl px-6">
                    <p
                      className="text-xs sm:text-sm uppercase tracking-[0.3em] mb-4"
                      style={{ color: theme.colors.muted }}
                    >
                      Vous êtes invité(e)
                    </p>
                    {guestInfo && (
                      <p
                        className="text-lg sm:text-xl font-semibold mb-6"
                        style={{ color: theme.colors.accent, fontFamily: `'${theme.fontDisplay}', serif` }}
                      >
                        Cher(e) {guestInfo.firstName} {guestInfo.lastName}
                      </p>
                    )}
                    <h1
                      className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight"
                      style={{
                        fontFamily: `'${theme.fontDisplay}', serif`,
                        color: theme.colors.primary,
                      }}
                    >
                      {event.title}
                    </h1>

                    <div className="mt-6 flex flex-col items-center gap-2">
                      <p className="text-sm sm:text-base" style={{ color: theme.colors.muted }}>
                        📅 {formattedDate}
                      </p>
                      <p className="text-sm sm:text-base" style={{ color: theme.colors.muted }}>
                        🕐 {formattedTime}
                      </p>
                      {event.location && (
                        <p className="text-sm sm:text-base" style={{ color: theme.colors.muted }}>
                          📍 {event.location}
                        </p>
                      )}
                    </div>

                    <div className="mt-6">
                      <Countdown targetDate={event.date} colors={theme.colors} />
                    </div>

                    {/* Description (ex-story page) */}
                    {event.description && (
                      <>
                        <SectionDivider colors={theme.colors} />
                        <p
                          className="text-sm sm:text-base leading-relaxed max-w-xl mx-auto"
                          style={{ color: theme.colors.text, lineHeight: 1.8 }}
                        >
                          {event.description}
                        </p>
                      </>
                    )}

                    {/* Scroll hint */}
                    {isEntryComplete && currentPage === 0 && totalPages > 1 && (
                      <button
                        onClick={goNext}
                        className="mt-8 animate-bounce opacity-40 hover:opacity-70 transition"
                      >
                        <svg className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span className="text-[10px] uppercase tracking-widest" style={{ color: theme.colors.muted }}>
                          Découvrir
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════════ PAGE 2 — L'ÉVÉNEMENT ═══════════════ */}
              {page.id === "evenement" && (
                <div className="h-full overflow-y-auto flex flex-col items-center px-6 py-16">
                  <div className="w-full max-w-2xl">
                    {/* Programme section */}
                    {hasProgramme && modulesData.programme && (
                      <>
                        <h2
                          className="text-xl sm:text-2xl font-bold mb-4 text-center"
                          style={{ fontFamily: `'${theme.fontDisplay}', serif`, color: theme.colors.primary }}
                        >
                          📋 Programme
                        </h2>
                        <ProgrammeContent
                          config={modulesData.programme}
                          colors={theme.colors}
                          fontDisplay={theme.fontDisplay}
                        />
                      </>
                    )}

                    {/* Divider between sections */}
                    {hasProgramme && hasMenu && (
                      <SectionDivider colors={theme.colors} />
                    )}

                    {/* Menu section */}
                    {hasMenu && modulesData.menu && (
                      <>
                        <h2
                          className="text-xl sm:text-2xl font-bold mb-4 text-center"
                          style={{ fontFamily: `'${theme.fontDisplay}', serif`, color: theme.colors.primary }}
                        >
                          🍽️ Menu
                        </h2>
                        <MenuContent
                          config={modulesData.menu}
                          colors={theme.colors}
                          fontDisplay={theme.fontDisplay}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════════ PAGE 3 — INFOS & MOMENTS ═══════════════ */}
              {page.id === "infos" && (
                <div className="h-full overflow-y-auto flex flex-col items-center px-6 py-16">
                  <div className="w-full max-w-2xl">
                    {/* Logistics section */}
                    {hasLogistics && modulesData.logistics && (
                      <>
                        <h2
                          className="text-xl sm:text-2xl font-bold mb-4 text-center"
                          style={{ fontFamily: `'${theme.fontDisplay}', serif`, color: theme.colors.primary }}
                        >
                          🚗 Infos pratiques
                        </h2>
                        <LogisticsContent
                          config={modulesData.logistics}
                          colors={theme.colors}
                          fontDisplay={theme.fontDisplay}
                        />
                      </>
                    )}

                    {/* Divider */}
                    {hasLogistics && hasGallery && (
                      <SectionDivider colors={theme.colors} />
                    )}

                    {/* Gallery section */}
                    {hasGallery && modulesData.gallery && (
                      <>
                        <h2
                          className="text-xl sm:text-2xl font-bold mb-4 text-center"
                          style={{ fontFamily: `'${theme.fontDisplay}', serif`, color: theme.colors.primary }}
                        >
                          📷 Galerie
                        </h2>
                        <GalleryContent config={modulesData.gallery} colors={theme.colors} />
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════════ PAGE 4 — CONFIRMATION ═══════════════ */}
              {page.id === "rsvp" && (
                <div className="h-full overflow-y-auto flex items-center justify-center px-6 py-16">
                  <div className="w-full max-w-lg">
                    <div
                      className="rounded-2xl p-6 sm:p-8"
                      style={{
                        backgroundColor: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                      }}
                    >
                      <h2
                        className="mb-2 text-center text-2xl font-bold"
                        style={{
                          fontFamily: `'${theme.fontDisplay}', serif`,
                          color: theme.colors.primary,
                        }}
                      >
                        Confirmer votre présence
                      </h2>
                      <p
                        className="mb-6 text-center text-sm"
                        style={{ color: theme.colors.muted }}
                      >
                        Nous serions ravis de vous compter parmi nous
                      </p>
                      <RsvpForm
                        eventId={event.id}
                        showMenu={activeModules.includes("MOD_MENU")}
                        colors={theme.colors}
                        guestInfo={guestInfo || undefined}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation dots — left side vertical */}
        {isEntryComplete && totalPages > 1 && (
          <nav
            className="fixed left-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2 items-center"
          >
            {pages.map((page, index) => (
              <button
                key={page.id}
                onClick={() => goTo(index)}
                className="group relative flex items-center"
                title={page.label}
              >
                <div
                  className="h-2.5 w-2.5 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: index === currentPage ? theme.colors.primary : theme.colors.border,
                    transform: index === currentPage ? "scale(1.3)" : "scale(1)",
                    boxShadow: index === currentPage ? `0 0 8px ${theme.colors.primary}60` : "none",
                  }}
                />
                {/* Label tooltip */}
                <span
                  className="absolute left-6 whitespace-nowrap text-[10px] font-medium px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    border: `1px solid ${theme.colors.border}`,
                  }}
                >
                  {page.icon} {page.label}
                </span>
              </button>
            ))}
          </nav>
        )}

        {/* Current page label — bottom center */}
        {isEntryComplete && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium backdrop-blur-sm"
              style={{
                backgroundColor: theme.colors.surface + "CC",
                color: theme.colors.muted,
                border: `1px solid ${theme.colors.border}`,
              }}
            >
              <span>{currentPageDef.icon}</span>
              <span>{currentPageDef.label}</span>
              <span className="opacity-50">·</span>
              <span className="tabular-nums">{currentPage + 1}/{totalPages}</span>
            </div>
          </div>
        )}

        {/* Arrow navigation — bottom sides */}
        {isEntryComplete && (
          <>
            {currentPage > 0 && (
              <button
                onClick={goPrev}
                aria-label="Page précédente"
                className="fixed bottom-6 left-20 z-30 flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-110"
                style={{
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {currentPage < totalPages - 1 && (
              <button
                onClick={goNext}
                aria-label="Page suivante"
                className="fixed bottom-6 right-20 z-30 flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-110"
                style={{
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* Floating Chat Bubble */}
      {hasChat && (
        <ChatBubble
          eventId={event.id}
          initialMessages={chatMessages}
          colors={theme.colors}
          fontBody={theme.fontBody}
          guestName={guestInfo ? `${guestInfo.firstName} ${guestInfo.lastName}` : undefined}
        />
      )}
    </div>
  );
}
