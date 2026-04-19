"use client";
// noinspection CssInlineStyles

import { useEffect, useState, useCallback, useRef, type CSSProperties } from "react";
import { AmbientEffect } from "@/components/effects/ambient-effect";
import { RsvpForm } from "@/components/public/rsvp-form";
import { ChatBubble } from "@/components/public/chat-bubble";
import { formatGuestDisplayName } from "@/convex/lib/guestDisplayName";
import "@/public/effects/entry-effects.css";
import "@/public/effects/ambient-effects.css";
import "@/public/effects/invitation-card.css";

// ─── Types pour les configs de modules ─────────────────

// Menu / Infos attaches directement a une etape du programme
interface ItemMenuCourse { name?: string; items?: string[]; icon?: string }
interface ItemMenu { label?: string; courses?: ItemMenuCourse[] }
interface ItemInfosSection { title?: string; icon?: string; description?: string; items?: string[] }
interface ItemInfos { sections?: ItemInfosSection[] }

interface ProgrammeItem {
  time?: string;
  endTime?: string;
  title?: string;
  description?: string;
  icon?: string;
  location?: string;
  address?: string;
  menu?: ItemMenu;
  infos?: ItemInfos;
}

interface ProgrammeDay {
  label?: string;
  date?: string;
  items?: ProgrammeItem[];
  steps?: ProgrammeItem[];
  events?: ProgrammeItem[];
}
interface ProgrammeConfig {
  days?: ProgrammeDay[];
  programme?: ProgrammeDay[];
}

interface MenuCourse { name?: string; description?: string; items?: string[]; icon?: string }
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
  rsvp?: {
    adultCount: number;
    childrenCount: number;
    menuChoice: string | null;
    allergies: string[];
    message: string | null;
  } | null;
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
    rsvpDeadline?: number | null;
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
  chatMessages: { id: string; senderName: string; senderRole: string; text: string; reactions: Record<string, number>; replyTo: { id: string; senderName: string; content: string } | null; sentAt: string }[];
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
        <video src={video} autoPlay loop muted playsInline className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover -translate-x-1/2 -translate-y-1/2" />
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
            className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover -translate-x-1/2 -translate-y-1/2"
            {...{ style: {
              opacity: idx === currentSlide ? 1 : 0,
              transition: "opacity 1s ease-in-out",
            } }}
          />
        ))}
        <div className="absolute inset-0 inv-cover-gradient" />
      </div>
    );
  }

  return null;
}

// ─── Programme Section ──────────────────────────────────────

// Hoist legacy : si un MOD_MENU.sections[*].programmeRef matche le titre d'une etape,
// on synthetise item.menu pour permettre l'affichage du bouton "Menu" sur cette etape.
function resolveProgrammeItem(item: ProgrammeItem, menuModule: MenuConfig | null): ProgrammeItem {
  if (item.menu && item.menu.courses && item.menu.courses.length > 0) return item;
  const sections = menuModule?.sections;
  if (!Array.isArray(sections) || !item.title) return item;
  const normalize = (s: string | undefined) => (s ?? "").trim().toLowerCase();
  const match = sections.find((s) => normalize(s.programmeRef) === normalize(item.title));
  if (!match) return item;
  return {
    ...item,
    menu: { label: match.label, courses: (match.courses || []) as ItemMenuCourse[] },
  };
}

// True si au moins une section du MOD_MENU legacy n'a PAS de programmeRef matchant une etape
// → on continue d'afficher le bloc Menu standalone pour ne pas perdre de donnees.
function hasUnmatchedMenuSections(menuModule: MenuConfig | null, allProgrammeItems: ProgrammeItem[]): boolean {
  const sections = menuModule?.sections;
  if (!Array.isArray(sections) || sections.length === 0) return !!(menuModule?.courses?.length); // flat courses → show
  const titles = new Set(allProgrammeItems.map((it) => (it.title ?? "").trim().toLowerCase()).filter(Boolean));
  return sections.some((s) => {
    const ref = (s.programmeRef ?? "").trim().toLowerCase();
    return !ref || !titles.has(ref);
  });
}

type OverlayState = { kind: "menu" | "infos"; item: ProgrammeItem } | null;

function ProgrammeContent({
  config,
  menuModule,
  onOpenOverlay,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  colors,
}: {
  config: Record<string, unknown>;
  menuModule: Record<string, unknown> | null;
  onOpenOverlay: (state: OverlayState) => void;
  colors: InvitationCardProps["theme"]["colors"];
  fontDisplay: string;
}) {
  const programme = config as ProgrammeConfig;
  const menu = (menuModule || null) as MenuConfig | null;
  const days = programme?.days || programme?.programme || [];
  const [activeDay, setActiveDay] = useState(0);

  if (!Array.isArray(days) || days.length === 0) {
    return <p className="inv-color-muted">Programme à venir...</p>;
  }

  const currentDay = days[activeDay];
  const rawItems = currentDay?.items || currentDay?.steps || currentDay?.events || [];
  const items: ProgrammeItem[] = rawItems.map((it) => resolveProgrammeItem(it, menu));

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
      <div className="space-y-1.5 sm:space-y-2 flex-1 min-h-0 overflow-y-auto">
        {items.map((item, idx) => {
          const hasMenu = !!(item.menu && (item.menu.courses?.length ?? 0) > 0);
          const hasInfos = !!(item.infos && (item.infos.sections?.length ?? 0) > 0);
          return (
            <div key={idx} className="flex gap-2 sm:gap-3 items-stretch">
              {/* Colonne gauche : horaire empile (debut / fin) + ligne verticale */}
              <div className="flex flex-col items-center w-14 sm:w-16 shrink-0 pt-0.5">
                <span className="text-[11px] sm:text-xs font-semibold tabular-nums inv-color-primary leading-tight">
                  {item.time || "—"}
                </span>
                {item.endTime && (
                  <span className="text-[9px] sm:text-[10px] tabular-nums inv-color-muted leading-tight">
                    {item.endTime}
                  </span>
                )}
                {idx < items.length - 1 && (
                  <div className="w-px flex-1 min-h-[20px] mt-1 inv-timeline-connector" />
                )}
              </div>
              {/* Colonne droite : carte etape */}
              <div className="flex-1 min-w-0 rounded-lg p-2 sm:p-2.5 inv-surface-card">
                <div className="flex items-center gap-1.5">
                  {item.icon && <span className="text-sm shrink-0">{item.icon}</span>}
                  <h4 className="text-xs sm:text-sm font-semibold inv-font-display inv-color-text truncate">
                    {item.title}
                  </h4>
                </div>
                {item.description && (
                  <p className="mt-1 text-[10px] sm:text-xs leading-snug line-clamp-2 inv-color-muted">
                    {item.description}
                  </p>
                )}
                {/* Lieu + adresse : empiles pour lisibilite mobile */}
                {(item.location || item.address) && (
                  <div className="mt-1 flex items-start gap-1 text-[10px] sm:text-[11px] inv-color-muted">
                    <span className="shrink-0 leading-none pt-[1px]">📍</span>
                    <div className="min-w-0 leading-snug">
                      {item.location && <div className="font-medium truncate">{item.location}</div>}
                      {item.address && <div className="line-clamp-2 opacity-90">{item.address}</div>}
                    </div>
                  </div>
                )}
                {/* Boutons Menu / Infos — centres, n'apparaissent que si les donnees existent */}
                {(hasMenu || hasInfos) && (
                  <div className="mt-1.5 flex gap-1.5 justify-center">
                    {hasMenu && (
                      <button
                        onClick={() => onOpenOverlay({ kind: "menu", item })}
                        className="inv-tab-inactive rounded-full px-2.5 py-1 text-[10px] font-medium transition-all hover:scale-105"
                        aria-label="Voir le menu"
                      >
                        🍽️ Menu
                      </button>
                    )}
                    {hasInfos && (
                      <button
                        onClick={() => onOpenOverlay({ kind: "infos", item })}
                        className="inv-tab-inactive rounded-full px-2.5 py-1 text-[10px] font-medium transition-all hover:scale-105"
                        aria-label="Voir les infos"
                      >
                        ℹ️ Infos
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Overlay card (carte flottante Menu / Infos) ──────────────
function ProgrammeOverlayCard({ overlay, onClose }: { overlay: OverlayState; onClose: () => void }) {
  const visible = overlay !== null;
  return (
    <div
      aria-hidden={!visible}
      className={`absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4 transition-opacity duration-200 ${visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
    >
      {/* Backdrop : clic pour fermer */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
      />
      {/* Panel — s'adapte au contenu (pas de max-h ni scroll) */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-[min(92%,360px)] rounded-xl p-4 inv-surface-card shadow-xl transition-transform duration-200 ${visible ? "scale-100" : "scale-95"}`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-full inv-color-muted hover:inv-color-primary transition-colors text-sm"
          aria-label="Fermer"
        >
          ✕
        </button>
        {overlay?.kind === "menu" && overlay.item.menu && (
          <div>
            <div className="flex items-center gap-2 mb-3 pr-6">
              <span className="text-lg">🍽️</span>
              <h3 className="text-sm font-semibold inv-font-display inv-color-text">
                {overlay.item.menu.label || overlay.item.title || "Menu"}
              </h3>
            </div>
            <div className="space-y-2.5">
              {(overlay.item.menu.courses || []).map((course, ci) => (
                <div key={ci} className="rounded-lg p-2 inv-surface-card">
                  <div className="flex items-center gap-1.5 mb-1">
                    {course.icon && <span className="text-sm">{course.icon}</span>}
                    <h4 className="text-xs font-semibold inv-color-primary">{course.name}</h4>
                  </div>
                  <ul className="space-y-0.5 pl-5 list-disc text-[11px] inv-color-muted marker:inv-color-primary">
                    {(course.items || []).filter(Boolean).map((it, ii) => (
                      <li key={ii}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
        {overlay?.kind === "infos" && overlay.item.infos && (
          <div>
            <div className="flex items-center gap-2 mb-3 pr-6">
              <span className="text-lg">ℹ️</span>
              <h3 className="text-sm font-semibold inv-font-display inv-color-text">
                {overlay.item.title ? `Infos — ${overlay.item.title}` : "Infos complémentaires"}
              </h3>
            </div>
            <div className="space-y-2.5">
              {(overlay.item.infos.sections || []).map((sec, si) => (
                <div key={si} className="rounded-lg p-2 inv-surface-card">
                  <div className="flex items-center gap-1.5 mb-1">
                    {sec.icon && <span className="text-sm">{sec.icon}</span>}
                    <h4 className="text-xs font-semibold inv-color-primary">{sec.title}</h4>
                  </div>
                  {sec.description && (
                    <p className="text-[11px] inv-color-muted leading-snug">{sec.description}</p>
                  )}
                  {(sec.items ?? []).length > 0 && (
                    <ul className="space-y-0.5 pl-5 list-disc text-[11px] inv-color-muted marker:inv-color-primary mt-1">
                      {(sec.items || []).filter(Boolean).map((it, ii) => (
                        <li key={ii}>{it}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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

function isVideoUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(url) || url.startsWith("data:video/");
}

export interface GalleryItem { url?: string; caption?: string }

function GalleryContent({
  config,
  onOpen,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  colors,
}: {
  config: Record<string, unknown>;
  onOpen: (index: number) => void;
  colors: InvitationCardProps["theme"]["colors"];
}) {
  const galConfig = config as GalleryConfig;
  const photos = galConfig?.photos || [];

  if (!Array.isArray(photos) || photos.length === 0) {
    return <p className="inv-color-muted">Galerie à venir...</p>;
  }

  // Grille responsive :
  // - 1 photo : 1 colonne pleine largeur, aspect-video
  // - 2-3 photos : 2 colonnes, carrees
  // - 4+ photos : 3 colonnes sur desktop / 2 sur mobile, carrees
  const count = photos.length;
  const gridClass =
    count === 1 ? "grid-cols-1"
    : count <= 4 ? "grid-cols-2"
    : "grid-cols-2 sm:grid-cols-3";
  const tileAspect = count === 1 ? "aspect-[4/3]" : "aspect-square";

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden">
      <div className={`grid ${gridClass} gap-1.5 sm:gap-2`}>
        {photos.map((photo: GalleryItem, i: number) => {
          const video = isVideoUrl(photo.url);
          return (
            <button
              key={i}
              onClick={() => onOpen(i)}
              className={`group relative ${tileAspect} overflow-hidden rounded-lg inv-gallery-unselected transition-all hover:scale-[1.02]`}
              aria-label={photo.caption || `Média ${i + 1}`}
            >
              {video ? (
                <>
                  <video
                    src={photo.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  {/* Play icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md">
                      <span className="text-black text-xs pl-0.5">▶</span>
                    </div>
                  </div>
                </>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={photo.url}
                  alt={photo.caption || `Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
              {photo.caption && (
                <div className="absolute inset-x-0 bottom-0 px-1.5 py-0.5 text-[9px] text-white bg-gradient-to-t from-black/60 to-transparent truncate">
                  {photo.caption}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Gallery Lightbox (carte flottante plein media) ──────────
function GalleryLightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: GalleryItem[];
  index: number | null;
  onClose: () => void;
  onNavigate: (next: number) => void;
}) {
  const visible = index !== null;
  const photo = index !== null ? photos[index] : null;
  const video = isVideoUrl(photo?.url);

  return (
    <div
      aria-hidden={!visible}
      className={`absolute inset-0 z-30 flex items-center justify-center p-3 transition-opacity duration-200 ${visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
      />
      {photo && (
        <div
          role="dialog"
          aria-modal="true"
          className={`relative z-10 w-[min(96%,440px)] max-h-[90%] flex flex-col transition-transform duration-200 ${visible ? "scale-100" : "scale-95"}`}
        >
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="absolute -top-1 -right-1 h-8 w-8 flex items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-md hover:bg-white transition-colors text-sm z-20"
            aria-label="Fermer"
          >
            ✕
          </button>
          {/* Media */}
          <div className="relative w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
            {video ? (
              <video
                src={photo.url}
                className="max-w-full max-h-[75vh] w-auto h-auto"
                controls
                autoPlay
                playsInline
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={photo.url}
                alt={photo.caption || "Photo"}
                className="max-w-full max-h-[75vh] w-auto h-auto object-contain"
              />
            )}
          </div>
          {photo.caption && (
            <p className="mt-2 text-center text-[11px] text-white/90 leading-snug px-2">
              {photo.caption}
            </p>
          )}
          {/* Navigation arrows */}
          {photos.length > 1 && index !== null && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onNavigate((index - 1 + photos.length) % photos.length); }}
                className="absolute left-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-md hover:bg-white transition-colors"
                aria-label="Précédent"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onNavigate((index + 1) % photos.length); }}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-md hover:bg-white transition-colors"
                aria-label="Suivant"
              >
                ›
              </button>
              {/* Counter */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-white/80 tabular-nums">
                {index + 1} / {photos.length}
              </div>
            </>
          )}
        </div>
      )}
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
  const [programmeOverlay, setProgrammeOverlay] = useState<OverlayState>(null);
  const [galleryLightbox, setGalleryLightbox] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Galerie photos (pour la lightbox)
  const galleryPhotos = ((modulesData.gallery as GalleryConfig | null)?.photos || []) as GalleryItem[];

  // Options de menu RSVP : aggreger les labels des menus attaches aux etapes du programme
  const programmeMenuOptions: string[] = (() => {
    const cfg = modulesData.programme as ProgrammeConfig | null;
    const days = cfg?.days || cfg?.programme || [];
    const labels = new Set<string>();
    for (const d of days) {
      const items = d.items || d.steps || d.events || [];
      for (const it of items as ProgrammeItem[]) {
        const label = it.menu?.label?.trim();
        if (label) labels.add(label);
      }
    }
    return Array.from(labels);
  })();

  // Fermeture overlays via Escape
  useEffect(() => {
    if (!programmeOverlay && galleryLightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (galleryLightbox !== null) setGalleryLightbox(null);
      else if (programmeOverlay) setProgrammeOverlay(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [programmeOverlay, galleryLightbox]);

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

  // noinspection CssInlineStyles
  return (
    <div
      ref={rootRef}
      className={`relative h-[100dvh] overflow-hidden inv-root safe-bottom ${entryClass}`}
      {...{ style: theme.cssVars as unknown as CSSProperties }}
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
                    {(() => {
                      // Determine si on doit afficher le bloc Menu standalone :
                      // on masque si toutes les sections du MOD_MENU matchent une etape (deja affichees via les boutons).
                      const programmeCfg = (modulesData.programme || {}) as ProgrammeConfig;
                      const allItems: ProgrammeItem[] = (programmeCfg.days || programmeCfg.programme || [])
                        .flatMap((d: ProgrammeDay) => d.items || d.steps || d.events || []);
                      const showStandaloneMenu = hasMenu
                        && hasUnmatchedMenuSections((modulesData.menu || null) as MenuConfig | null, allItems);
                      return (
                        <>
                          {/* Programme section */}
                          {hasProgramme && modulesData.programme && (
                            <div className={`flex flex-col min-h-0 overflow-hidden ${showStandaloneMenu ? "flex-1" : "flex-1"}`}>
                              <h2 className="text-base sm:text-xl font-bold mb-2 sm:mb-3 text-center shrink-0 inv-section-heading">
                                📋 Programme
                              </h2>
                              <div className="flex-1 min-h-0 overflow-hidden">
                                <ProgrammeContent
                                  config={modulesData.programme}
                                  menuModule={modulesData.menu}
                                  onOpenOverlay={setProgrammeOverlay}
                                  colors={theme.colors}
                                  fontDisplay={theme.fontDisplay}
                                />
                              </div>
                            </div>
                          )}

                          {/* Divider compact — seulement si le bloc Menu standalone est visible */}
                          {hasProgramme && showStandaloneMenu && (
                            <SectionDivider colors={theme.colors} compact />
                          )}

                          {/* Menu section standalone (backwards-compat : sections sans programmeRef correspondant) */}
                          {showStandaloneMenu && modulesData.menu && (
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
                        </>
                      );
                    })()}
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
                          <GalleryContent config={modulesData.gallery} onOpen={setGalleryLightbox} colors={theme.colors} />
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
                        showMenu={activeModules.includes("MOD_MENU") || programmeMenuOptions.length > 0}
                        showChildren={(modulesData.rsvp as { allowChildren?: boolean } | null)?.allowChildren !== false}
                        colors={theme.colors}
                        guestInfo={guestInfo || undefined}
                        menuOptions={programmeMenuOptions}
                        rsvpDeadline={event.rsvpDeadline ?? null}
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
                className="fixed bottom-6 left-16 sm:left-20 z-30 flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-110 inv-arrow-btn"
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
                className="fixed bottom-6 right-16 sm:right-20 z-30 flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-110 inv-arrow-btn"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* Floating Chat Bubble — accessible en ecriture uniquement apres RSVP confirme */}
      {hasChat && (() => {
        // Nom auto : "Prenom I." ou "Prenom I.J." pour les noms composes (Dupont-Martin)
        const displayName = guestInfo
          ? formatGuestDisplayName(guestInfo.firstName, guestInfo.lastName)
          : undefined;
        const hasConfirmedPresence = !!(guestInfo?.hasRsvp && guestInfo.presence === true);
        return (
          <ChatBubble
            eventId={event.id}
            initialMessages={chatMessages}
            colors={theme.colors}
            fontBody={theme.fontBody}
            guestName={displayName}
            hasConfirmedPresence={hasConfirmedPresence}
            inviteToken={guestInfo?.inviteToken}
          />
        );
      })()}

      {/* Carte flottante Menu / Infos (niveau racine — couvre tout le frame) */}
      <ProgrammeOverlayCard overlay={programmeOverlay} onClose={() => setProgrammeOverlay(null)} />

      {/* Galerie lightbox (carte flottante plein media) */}
      <GalleryLightbox
        photos={galleryPhotos}
        index={galleryLightbox}
        onClose={() => setGalleryLightbox(null)}
        onNavigate={setGalleryLightbox}
      />
    </div>
  );
}
