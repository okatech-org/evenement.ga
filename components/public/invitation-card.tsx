"use client";

import { useEffect, useState, useCallback, useRef, type CSSProperties } from "react";
import { AmbientEffect } from "@/components/effects/ambient-effect";
import { RsvpForm } from "@/components/public/rsvp-form";
import { ChatBubble } from "@/components/public/chat-bubble";
import "@/public/effects/entry-effects.css";
import "@/public/effects/ambient-effects.css";
import "@/public/effects/invitation-card.css";

// ─── Types pour les configs de modules ─────────────────
interface ProgrammeDay {
  label?: string;
  date?: string;
  items?: Array<{ time?: string; title?: string; description?: string; icon?: string }>;
  steps?: Array<{ time?: string; title?: string; description?: string; icon?: string }>;
  events?: Array<{ time?: string; title?: string; description?: string; icon?: string }>;
}
interface ProgrammeConfig {
  days?: ProgrammeDay[];
  programme?: ProgrammeDay[];
}

interface MenuCourse { name?: string; description?: string; items?: string[] }
interface MenuSection { label?: string; programmeRef?: string; courses?: MenuCourse[]; description?: string; items?: string[] }
interface MenuConfig {
  courses?: MenuCourse[];
  sections?: MenuSection[];
  menu?: MenuCourse[];
}

interface LogisticsSection { title?: string; icon?: string; description?: string; items?: string[] }
interface LogisticsConfig {
  sections?: LogisticsSection[];
  logistics?: LogisticsSection[];
  items?: LogisticsSection[];
}

interface GalleryPhoto { url: string; caption?: string }
interface GalleryConfig {
  photos?: GalleryPhoto[];
}

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
    pageMedia?: Record<string, unknown>;
    pageThemes?: Record<string, unknown>;
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
  initialPage?: number;
}

interface PageDef {
  id: string;
  icon: string;
  label: string;
}

// ─── Countdown ──────────────────────────────────────────────

function Countdown({ targetDate }: { targetDate: string; colors: InvitationCardProps["theme"]["colors"] }) {
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

  if (!mounted) {
    return (
      <div className="flex justify-center gap-3 sm:gap-5" suppressHydrationWarning>
        {["--", "--", "--", "--"].map((v, i) => (
          <div key={i} className="flex flex-col items-center">
            <span className="text-xl sm:text-3xl font-bold inv-font-display inv-color-accent tabular-nums">{v}</span>
          </div>
        ))}
      </div>
    );
  }

  const isPast = new Date(targetDate).getTime() <= Date.now();
  if (isPast) {
    return (
      <p className="text-base font-medium inv-font-display inv-color-muted">
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
          className="flex flex-col items-center rounded-xl px-3 py-2 inv-countdown-box"
        >
          <span className="text-2xl sm:text-3xl font-bold tabular-nums inv-countdown-value">
            {String(value).padStart(2, "0")}
          </span>
          <span className="mt-0.5 text-[10px] uppercase tracking-widest inv-color-muted">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Per-page Background (Carousel / Video) ────────────────

function PageBackground({ pageId, theme }: { pageId: string; theme: InvitationCardProps["theme"] }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const pageMediaData = theme.pageMedia?.[pageId] as { images?: string[]; video?: string | null } | undefined;
  const images = pageMediaData?.images || [];
  const video = pageMediaData?.video || null;

  // Auto-rotate carousel
  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  if (video) {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video src={video} autoPlay loop muted playsInline className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover" style={{ transform: "translate(-50%, -50%)" }} />
        <div className="absolute inset-0 inv-cover-gradient" />
      </div>
    );
  }

  if (images.length > 0) {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden">
        {images.map((url, idx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={idx}
            src={url}
            alt=""
            className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover"
            style={{
              transform: "translate(-50%, -50%)",
              opacity: idx === currentSlide ? 1 : 0,
              transition: "opacity 1s ease-in-out",
            }}
          />
        ))}
        <div className="absolute inset-0 inv-cover-gradient" />
      </div>
    );
  }

  return null;
}

// ─── Programme Section ──────────────────────────────────────

function ProgrammeContent({
  config,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  colors,
}: {
  config: Record<string, unknown>;
  colors: InvitationCardProps["theme"]["colors"];
  fontDisplay: string;
}) {
  const programme = config as ProgrammeConfig;
  const days = programme?.days || programme?.programme || [];
  const [activeDay, setActiveDay] = useState(0);

  if (!Array.isArray(days) || days.length === 0) {
    return <p className="inv-color-muted">Programme à venir...</p>;
  }

  const currentDay = days[activeDay];
  const items = currentDay?.items || currentDay?.steps || currentDay?.events || [];

  return (
    <div className="w-full flex flex-col min-h-0 overflow-hidden">
      {/* Day selector */}
      {days.length > 1 && (
        <div className="flex gap-2 mb-2 sm:mb-4 justify-center shrink-0">
          {days.map((day: { label?: string; date?: string }, i: number) => (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              className={`px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all ${activeDay === i ? "inv-tab-active" : "inv-tab-inactive"}`}
            >
              {day.label || day.date || `Jour ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-0 flex-1 min-h-0 overflow-hidden">
        {items.map((item: { time?: string; title?: string; description?: string; icon?: string; location?: string; address?: string }, idx: number) => (
          <div key={idx} className="flex gap-2 sm:gap-3 items-start">
            <div className="flex flex-col items-center w-12 sm:w-14 shrink-0">
              <span className="text-[10px] sm:text-[11px] font-semibold tabular-nums inv-color-primary">
                {item.time || "—"}
              </span>
              {idx < items.length - 1 && (
                <div className="w-px flex-1 min-h-[16px] sm:min-h-[24px] mt-0.5 inv-timeline-connector" />
              )}
            </div>
            <div className="flex-1 rounded-lg p-1.5 sm:p-2.5 mb-1 sm:mb-2 inv-surface-card">
              <div className="flex items-center gap-1.5">
                {item.icon && <span className="text-xs sm:text-sm">{item.icon}</span>}
                <h4 className="text-xs sm:text-sm font-semibold inv-font-display inv-color-text">
                  {item.title}
                </h4>
              </div>
              {item.description && (
                <p className="mt-0.5 text-[10px] sm:text-xs leading-tight line-clamp-1 sm:line-clamp-2 inv-color-muted">
                  {item.description}
                </p>
              )}
              {/* Location & Address */}
              {(item.location || item.address) && (
                <div className="mt-1 flex items-center gap-1 text-[9px] sm:text-[10px] inv-color-muted">
                  <span>📍</span>
                  <span className="truncate">
                    {item.location}{item.location && item.address ? " — " : ""}{item.address}
                  </span>
                </div>
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  colors,
}: {
  config: Record<string, unknown>;
  colors: InvitationCardProps["theme"]["colors"];
  fontDisplay: string;
}) {
  const menuConfig = config as MenuConfig;

  // Support both flat courses and multi-section menus
  const sections = menuConfig?.sections || null;
  const flatCourses = menuConfig?.courses || menuConfig?.menu || [];
  const hasMultipleSections = Array.isArray(sections) && sections.length > 1;
  const [activeSection, setActiveSection] = useState(0);

  // Determine which courses to render
  const coursesToRender = hasMultipleSections
    ? (sections[activeSection]?.courses || [])
    : Array.isArray(sections) && sections.length === 1
      ? (sections[0]?.courses || flatCourses)
      : flatCourses;

  if (
    (!Array.isArray(coursesToRender) || coursesToRender.length === 0) &&
    (!Array.isArray(sections) || sections.length === 0)
  ) {
    return <p className="inv-color-muted">Menu à venir...</p>;
  }

  return (
    <div className="w-full space-y-1.5 sm:space-y-3 overflow-hidden">
      {/* Section tabs (if multiple menu types) */}
      {hasMultipleSections && (
        <div className="flex gap-2 mb-1 sm:mb-2 justify-center flex-wrap">
          {sections.map((s: { label?: string; programmeRef?: string }, i: number) => (
            <button
              key={i}
              onClick={() => setActiveSection(i)}
              className={`px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all ${activeSection === i ? "inv-tab-active" : "inv-tab-inactive"}`}
            >
              {s.label || s.programmeRef || `Menu ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Single section label (if one section with label) */}
      {Array.isArray(sections) && sections.length === 1 && sections[0]?.label && (
        <p className="text-center text-[10px] sm:text-xs font-medium inv-color-muted">
          {sections[0].label}
        </p>
      )}

      {coursesToRender.map((course: { name?: string; items?: string[]; icon?: string }, idx: number) => (
        <div
          key={idx}
          className="rounded-lg p-2 sm:p-3 inv-surface-card"
        >
          <h4 className="text-xs sm:text-sm font-semibold mb-1 inv-font-display inv-color-primary">
            {course.icon || "🍽️"} {course.name}
          </h4>
          {course.items && (
            <ul className="space-y-0.5">
              {course.items.map((item: string, i: number) => (
                <li key={i} className="text-[10px] sm:text-xs flex items-center gap-1.5 inv-color-text">
                  <span className="w-1 h-1 rounded-full shrink-0 inv-dot" />
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  colors,
}: {
  config: Record<string, unknown>;
  colors: InvitationCardProps["theme"]["colors"];
  fontDisplay: string;
}) {
  const logConfig = config as LogisticsConfig;
  const sections = logConfig?.sections || logConfig?.logistics || logConfig?.items || [];

  if (!Array.isArray(sections) || sections.length === 0) {
    return <p className="inv-color-muted">Informations à venir...</p>;
  }

  return (
    <div className="w-full space-y-1.5 sm:space-y-3 overflow-hidden">
      {sections.map((section: { title?: string; description?: string; items?: string[]; icon?: string }, idx: number) => (
        <div
          key={idx}
          className="rounded-lg p-2 sm:p-3 inv-surface-card"
        >
          <h4 className="text-xs sm:text-sm font-semibold mb-1 inv-font-display inv-color-primary">
            {section.icon || "📍"} {section.title}
          </h4>
          {section.description && (
            <p className="text-[10px] sm:text-xs leading-tight line-clamp-2 inv-color-text">
              {section.description}
            </p>
          )}
          {section.items && (
            <ul className="mt-1 space-y-0.5">
              {section.items.map((item: string, i: number) => (
                <li key={i} className="text-[10px] sm:text-xs flex items-center gap-1.5 inv-color-muted">
                  <span className="w-1 h-1 rounded-full shrink-0 inv-dot" />
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  colors,
}: {
  config: Record<string, unknown>;
  colors: InvitationCardProps["theme"]["colors"];
}) {
  const galConfig = config as GalleryConfig;
  const photos = galConfig?.photos || [];
  const [selected, setSelected] = useState<number | null>(null);

  if (!Array.isArray(photos) || photos.length === 0) {
    return <p className="inv-color-muted">Galerie à venir...</p>;
  }

  return (
    <div className="w-full h-full min-h-0 overflow-hidden">
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 h-full inv-gallery-grid">
        {photos.map((photo: { url?: string; caption?: string }, i: number) => (
          <button
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            className={`relative overflow-hidden rounded-lg transition-all hover:scale-[1.02] min-h-0 ${selected === i ? "inv-gallery-selected" : "inv-gallery-unselected"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption || `Photo ${i + 1}`}
              className="w-full h-full object-cover"
            />
            {photo.caption && selected === i && (
              <div
                className="absolute inset-x-0 bottom-0 px-2 py-1 text-[10px] inv-color-text inv-gallery-caption"
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

function SectionDivider({ compact = false }: { colors: InvitationCardProps["theme"]["colors"]; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 shrink-0 ${compact ? "my-2 sm:my-3" : "my-6"}`}>
      <div className="flex-1 h-px inv-bg-border" />
      <div className="h-1.5 w-1.5 rounded-full inv-dot" />
      <div className="flex-1 h-px inv-bg-border" />
    </div>
  );
}

// ─── Main InvitationCard ────────────────────────────────────

export function InvitationCard({ event, theme, activeModules, modulesData, chatMessages, guestInfo, initialPage }: InvitationCardProps) {
  const [currentPage, setCurrentPage] = useState(initialPage ?? 0);
  const [isEntryComplete, setIsEntryComplete] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Sync preview page from editor
  useEffect(() => {
    if (initialPage !== undefined && initialPage !== currentPage) {
      setCurrentPage(initialPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPage]);

  useEffect(() => {
    const timer = setTimeout(() => setIsEntryComplete(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Remove entry animation class after it completes to prevent CSS filter from
  // creating a containing block that traps fixed-positioned elements (chat panel)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const handleEnd = () => {
      el.style.filter = "none";
      // Remove the entry-* class
      el.className = el.className.replace(/entry-[\w-]+/g, "").trim();
    };
    el.addEventListener("animationend", handleEnd);
    return () => el.removeEventListener("animationend", handleEnd);
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

  // Formater la date de maniere deterministe pour eviter les hydration mismatches
  const eventDate = new Date(event.date);
  const [formattedDate, setFormattedDate] = useState("");
  const [formattedTime, setFormattedTime] = useState("");

  useEffect(() => {
    setFormattedDate(
      eventDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
    setFormattedTime(
      eventDate.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.date]);

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
      ref={rootRef}
      className={`relative h-screen overflow-hidden inv-root ${entryClass}`}
      style={theme.cssVars as unknown as CSSProperties}
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
              className={`absolute inset-0 flex flex-col inv-page-transition ${
                index === currentPage
                  ? "inv-page-current"
                  : index < currentPage
                    ? "inv-page-before"
                    : "inv-page-after"
              }`}
            >
              {/* ═══════════════ PAGE 1 — ACCUEIL ═══════════════ */}
              {page.id === "accueil" && (
                <div className="h-full relative flex flex-col items-center justify-center">
                  {/* Per-page media background (carousel / video) */}
                  <PageBackground pageId="accueil" theme={theme} />
                  {/* Legacy fallback: global cover (only if no per-page media) */}
                  {!(theme.pageMedia?.accueil as { images?: string[]; video?: string | null } | undefined)?.images?.length && !(theme.pageMedia?.accueil as { images?: string[]; video?: string | null } | undefined)?.video && hasCoverMedia && (
                    <div className="absolute inset-0 z-0 overflow-hidden">
                      {event.coverVideo ? (
                        <video src={event.coverVideo} autoPlay loop muted playsInline className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover inv-cover-media" />
                      ) : event.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={event.coverImage} alt={event.title} className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover inv-cover-media" />
                      ) : null}
                      <div className="absolute inset-0 inv-cover-gradient" />
                    </div>
                  )}

                  <div className="relative z-10 text-center max-w-2xl px-6">
                    <p className="text-xs sm:text-sm uppercase tracking-[0.3em] mb-4 inv-color-muted">
                      Vous êtes invité(e)
                    </p>
                    {guestInfo && (
                      <p className="text-lg sm:text-xl font-semibold mb-6 inv-color-accent inv-font-display">
                        Cher(e) {guestInfo.firstName} {guestInfo.lastName}
                      </p>
                    )}
                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight inv-font-display inv-color-primary">
                      {event.title}
                    </h1>

                    <div className="mt-3 sm:mt-6 flex flex-col items-center gap-1 sm:gap-2">
                      <p className="text-sm sm:text-base inv-color-muted">
                        📅 {formattedDate}
                      </p>
                      <p className="text-sm sm:text-base inv-color-muted">
                        🕐 {formattedTime}
                      </p>
                      {event.location && (
                        <p className="text-sm sm:text-base inv-color-muted">
                          📍 {event.location}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 sm:mt-6">
                      <Countdown targetDate={event.date} colors={theme.colors} />
                    </div>

                    {/* Description (ex-story page) */}
                    {event.description && (
                      <>
                        <SectionDivider colors={theme.colors} />
                        <p className="text-xs sm:text-sm lg:text-base leading-relaxed max-w-xl mx-auto line-clamp-3 sm:line-clamp-5 inv-description">
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
                        <span className="text-[10px] uppercase tracking-widest inv-color-muted">
                          Découvrir
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════════ PAGE 2 — L'ÉVÉNEMENT ═══════════════ */}
              {page.id === "evenement" && (
                <div className="h-full overflow-hidden flex flex-col items-center px-4 sm:px-6 pt-3 sm:pt-6 pb-[70px] relative">
                  <PageBackground pageId="evenement" theme={theme} />
                  <div className="w-full max-w-2xl flex-1 min-h-0 flex flex-col overflow-hidden relative z-10">
                    {/* Programme section */}
                    {hasProgramme && modulesData.programme && (
                      <div className={`flex flex-col min-h-0 overflow-hidden ${hasMenu ? "flex-1" : ""}`}>
                        <h2 className="text-base sm:text-xl font-bold mb-2 sm:mb-3 text-center shrink-0 inv-section-heading">
                          📋 Programme
                        </h2>
                        <div className="flex-1 min-h-0 overflow-hidden">
                          <ProgrammeContent
                            config={modulesData.programme}
                            colors={theme.colors}
                            fontDisplay={theme.fontDisplay}
                          />
                        </div>
                      </div>
                    )}

                    {/* Divider compact */}
                    {hasProgramme && hasMenu && (
                      <SectionDivider colors={theme.colors} compact />
                    )}

                    {/* Menu section */}
                    {hasMenu && modulesData.menu && (
                      <div className={`flex flex-col min-h-0 overflow-hidden ${hasProgramme ? "flex-1" : ""}`}>
                        <h2 className="text-base sm:text-xl font-bold mb-2 sm:mb-3 text-center shrink-0 inv-section-heading">
                          🍽️ Menu
                        </h2>
                        <div className="flex-1 min-h-0 overflow-hidden">
                          <MenuContent
                            config={modulesData.menu}
                            colors={theme.colors}
                            fontDisplay={theme.fontDisplay}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════════ PAGE 3 — INFOS & MOMENTS ═══════════════ */}
              {page.id === "infos" && (
                <div className="h-full overflow-hidden flex flex-col items-center px-4 sm:px-6 pt-3 sm:pt-6 pb-[70px] relative">
                  <PageBackground pageId="infos" theme={theme} />
                  <div className="w-full max-w-2xl flex-1 min-h-0 flex flex-col overflow-hidden relative z-10">
                    {/* Logistics section */}
                    {hasLogistics && modulesData.logistics && (
                      <div className="flex flex-col shrink-0 overflow-hidden">
                        <h2 className="text-base sm:text-xl font-bold mb-2 sm:mb-3 text-center shrink-0 inv-section-heading">
                          🚗 Infos pratiques
                        </h2>
                        <div className="overflow-hidden">
                          <LogisticsContent
                            config={modulesData.logistics}
                            colors={theme.colors}
                            fontDisplay={theme.fontDisplay}
                          />
                        </div>
                      </div>
                    )}

                    {/* Divider compact */}
                    {hasLogistics && hasGallery && (
                      <SectionDivider colors={theme.colors} compact />
                    )}

                    {/* Gallery section — prend l'espace restant */}
                    {hasGallery && modulesData.gallery && (
                      <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
                        <h2 className="text-base sm:text-xl font-bold mb-2 sm:mb-3 text-center shrink-0 inv-section-heading">
                          📷 Galerie
                        </h2>
                        <div className="flex-1 min-h-0 overflow-hidden">
                          <GalleryContent config={modulesData.gallery} colors={theme.colors} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════════ PAGE 4 — CONFIRMATION ═══════════════ */}
              {page.id === "rsvp" && (
                <div className="h-full overflow-hidden flex items-center justify-center px-4 sm:px-6 pt-2 sm:pt-6 pb-[70px] relative">
                  <PageBackground pageId="rsvp" theme={theme} />
                  <div className="w-full max-w-lg max-h-full overflow-hidden relative z-10">
                    <div className="rounded-2xl p-4 sm:p-6 lg:p-8 inv-surface-card">
                      <h2 className="mb-1 text-center text-lg sm:text-2xl font-bold inv-section-heading">
                        Confirmer votre présence
                      </h2>
                      <p className="mb-2 sm:mb-4 text-center text-xs sm:text-sm inv-color-muted">
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
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${index === currentPage ? "inv-nav-dot-active" : "inv-nav-dot-inactive"}`}
                />
                {/* Label tooltip */}
                <span className="absolute left-6 whitespace-nowrap text-[10px] font-medium px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none inv-nav-tooltip">
                  {page.icon} {page.label}
                </span>
              </button>
            ))}
          </nav>
        )}

        {/* Current page label — bottom center */}
        {isEntryComplete && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium backdrop-blur-sm inv-bottom-pill">
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
                className="fixed bottom-6 left-20 z-30 flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-110 inv-arrow-btn"
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
                className="fixed bottom-6 right-20 z-30 flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-110 inv-arrow-btn"
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
