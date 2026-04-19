"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Save,
  Upload,
  X,
  Image as ImageIcon,
  Video,
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Check,
  Loader2,
  Eye,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { DevicePreviewFrame, DEVICE_PRESETS, type DevicePreset } from "./device-preview-frame";
import { DeviceSwitcher } from "./device-switcher";
import { InvitationCard } from "@/components/public/invitation-card";
import { Palette } from "lucide-react";
import { VenuesEditor, type VenueDraft } from "./venues-editor";

// ─── Types ──────────────────────────────────────────────

interface ModuleData {
  id: string;
  type: string;
  active: boolean;
  order: number;
  configJson: Record<string, unknown>;
}

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  surface: string;
  muted: string;
  border: string;
}

interface ThemeData {
  cssVars: Record<string, string>;
  fontDisplay: string;
  fontBody: string;
  entryEffect: string;
  ambientEffect: string | null;
  ambientIntensity: number;
  scrollReveal: string;
  pageMedia: Record<string, unknown>;
  pageThemes: Record<string, unknown>;
  colors: ThemeColors;
}

interface EventEditClientProps {
  event: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    date: string;
    endDate: string | null;
    /** Liste complète des dates (ISO strings) — multi-jour. Fallback : [date]. */
    dates?: string[];
    location: string | null;
    coverImage: string | null;
    coverVideo: string | null;
    rsvpDeadline: number | null;
    type: string;
    organizer: string | null;
    guestCount: number;
    modules: ModuleData[];
    /** Venues chargées depuis Convex — éditables via l'onglet Accueil. */
    venues?: VenueDraft[];
  };
  theme: ThemeData;
}

// ─── Step definitions ───────────────────────────────────

const STEPS = [
  { id: "accueil", label: "Accueil", icon: "🏠", desc: "Titre, description, médias", previewPage: 0 },
  { id: "evenement", label: "L'événement", icon: "📋", desc: "Programme & Menu", previewPage: 1 },
  { id: "infos", label: "Infos & Moments", icon: "📍", desc: "Logistique & Galerie", previewPage: 2 },
  { id: "rsvp", label: "Confirmation", icon: "✅", desc: "RSVP & Paramètres", previewPage: 3 },
];

const PAGE_KEYS = ["accueil", "evenement", "infos", "rsvp"] as const;
type PageKey = typeof PAGE_KEYS[number];

interface PageMediaData {
  images: string[];
  video: string | null;
}

interface PageThemeOverride {
  colorBackground?: string;
  colorText?: string;
  colorPrimary?: string;
}

// ─── Types pour Menu/Infos attaches a une etape du programme ─
interface ItemMenuCourse { name: string; items: string[]; icon?: string }
interface ItemMenu { label?: string; courses: ItemMenuCourse[] }
interface ItemInfosSection { title?: string; icon?: string; description?: string; items?: string[] }
interface ItemInfos { sections: ItemInfosSection[] }

interface ProgrammeItemAdmin {
  time: string;
  endTime?: string;
  title: string;
  description: string;
  icon: string;
  location?: string;
  address?: string;
  menu?: ItemMenu;
  infos?: ItemInfos;
  [key: string]: unknown;
}
interface ProgrammeDayAdmin {
  label: string;
  items: ProgrammeItemAdmin[];
}

// ─── Collapsible Section ─────────────────────────────────

function EditorSection({
  title,
  icon,
  children,
  badge,
  defaultOpen = true,
}: {
  title: string;
  icon: string | React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden transition-all">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } }}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer select-none"
      >
        <span className="text-sm">{icon}</span>
        <span className="flex-1 text-sm font-semibold text-gray-900 dark:text-white truncate">
          {title}
        </span>
        {badge && <span className="shrink-0">{badge}</span>}
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50 dark:border-gray-800/50 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Module Toggle ───────────────────────────────────────

function ModuleToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-label={active ? "Désactiver le module" : "Activer le module"}
      className={`relative h-5 w-9 rounded-full transition flex-shrink-0 ${
        active ? "bg-[#7A3A50]" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <div
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${active ? "left-[18px]" : "left-[2px]"}`}
      />
    </button>
  );
}

// ─── Component ──────────────────────────────────────────

export function EventEditClient({ event, theme }: EventEditClientProps) {
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step");
  const currentStep = stepParam ? parseInt(stepParam, 10) : 0;

  // ── Device state ──
  const [selectedDevice, setSelectedDevice] = useState<DevicePreset>(DEVICE_PRESETS[1]); // iPhone 14

  // ── Form state ──
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || "");
  // Dates multi-jour (strings "YYYY-MM-DD"). Fallback : date principale seule.
  const [dates, setDates] = useState<string[]>(() => {
    if (event.dates && event.dates.length > 0) {
      return event.dates.map((d) => d.split("T")[0]);
    }
    return [event.date.split("T")[0]];
  });
  const [location, setLocation] = useState(event.location || "");
  // Venues éditables — chargées depuis le server (via event.venues).
  const [venues, setVenues] = useState<VenueDraft[]>(event.venues || []);
  // RSVP deadline : timestamp ms ; input datetime-local (format "YYYY-MM-DDTHH:mm")
  const [rsvpDeadline, setRsvpDeadline] = useState<string>(() => {
    if (!event.rsvpDeadline) return "";
    const d = new Date(event.rsvpDeadline);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  // coverImage/coverVideo: read-only state for preview (per-page media system replaces the editor)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [coverImage, _setCoverImage] = useState(event.coverImage);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [coverVideo, _setCoverVideo] = useState(event.coverVideo);

  // ── Per-page media & theme overrides ──
  const initPageMedia = (raw: Record<string, unknown>): Record<PageKey, PageMediaData> => {
    const result = {} as Record<PageKey, PageMediaData>;
    for (const key of PAGE_KEYS) {
      const d = (raw[key] || {}) as Partial<PageMediaData>;
      result[key] = { images: d.images || [], video: d.video || null };
    }
    return result;
  };
  const initPageThemes = (raw: Record<string, unknown>): Record<PageKey, PageThemeOverride | null> => {
    const result = {} as Record<PageKey, PageThemeOverride | null>;
    for (const key of PAGE_KEYS) {
      result[key] = (raw[key] as PageThemeOverride) || null;
    }
    return result;
  };

  const [pageMedia, setPageMedia] = useState(() => initPageMedia(theme.pageMedia));
  const [pageThemes, setPageThemes] = useState(() => initPageThemes(theme.pageThemes));

  const updatePageMedia = (pageKey: PageKey, data: Partial<PageMediaData>) => {
    setPageMedia(prev => ({ ...prev, [pageKey]: { ...prev[pageKey], ...data } }));
  };

  const updatePageTheme = (pageKey: PageKey, data: PageThemeOverride | null) => {
    setPageThemes(prev => ({ ...prev, [pageKey]: data }));
  };

  // ── Module configs ──
  const [modules, setModules] = useState<ModuleData[]>(event.modules);

  const getModule = (type: string) => modules.find((m) => m.type === type);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getConfig = (type: string): any => getModule(type)?.configJson || {};

  const updateModuleConfig = (type: string, config: Record<string, unknown>) => {
    setModules((prev) =>
      prev.map((m) => (m.type === type ? { ...m, configJson: config } : m))
    );
  };

  const toggleModule = (type: string) => {
    setModules((prev) =>
      prev.map((m) => (m.type === type ? { ...m, active: !m.active } : m))
    );
  };

  // ── Save state ──
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const pageMediaImageRef = useRef<HTMLInputElement>(null);
  const pageMediaVideoRef = useRef<HTMLInputElement>(null);
  const galleryUploadRef = useRef<HTMLInputElement>(null);
  const [pendingUploadPage, setPendingUploadPage] = useState<PageKey | null>(null);

  // ── Dates helpers (multi-jour) ──
  function addDate() {
    setDates((prev) => [...prev, ""]);
  }
  function removeDate(index: number) {
    setDates((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }
  function updateDate(index: number, value: string) {
    setDates((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleSave() {
    setIsSaving(true);
    setSaved(false);
    try {
      // Filtrer les dates vides avant envoi
      const cleanDates = dates.filter(Boolean);
      if (cleanDates.length === 0) {
        console.warn("Aucune date valide — la sauvegarde des dates est ignorée");
      }

      await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          // Multi-jour : envoie la liste complète. Fallback legacy `date` si vide.
          ...(cleanDates.length > 0 ? { dates: cleanDates } : {}),
          location: location || null,
          rsvpDeadline: rsvpDeadline ? new Date(rsvpDeadline).getTime() : null,
        }),
      });

      if (modules.length > 0) {
        await fetch(`/api/events/${event.id}/modules`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modules }),
        });
      }

      // Save per-page media & themes
      await fetch(`/api/events/${event.id}/theme`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageMedia, pageThemes }),
      });

      // Remplacer les venues (atomic via replaceAll). Filtrer celles incomplètes.
      const cleanVenues = venues
        .filter((v) => v.name && v.address)
        .map((v, i) => ({
          name: v.name,
          address: v.address,
          date: v.date || cleanDates[0] || "",
          startTime: v.startTime || null,
          endTime: v.endTime || null,
          order: i,
          description: v.description || null,
        }));
      await fetch(`/api/events/${event.id}/venues`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venues: cleanVenues }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  }



  // ── Helper : upload un fichier unique ──
  async function uploadSingleFile(file: File, type: "image" | "video"): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type === "image" ? "cover" : "video");

      const res = await fetch(`/api/events/${event.id}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) return data.url as string;

      const errorMsg = data.error || `Erreur ${res.status}`;
      setUploadError(errorMsg);
      setTimeout(() => setUploadError(null), 5000);
      return null;
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError("Erreur réseau lors de l'upload");
      setTimeout(() => setUploadError(null), 5000);
      return null;
    }
  }

  // ── Per-page media upload (supporte multi-select) ──
  async function handlePageMediaUpload(files: FileList | File[], type: "image" | "video", pageKey: PageKey) {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      if (type === "video") {
        // Videos: on garde le comportement actuel (1 seule video, remplace)
        const url = await uploadSingleFile(arr[0], "video");
        if (url) updatePageMedia(pageKey, { video: url, images: [] });
        return;
      }

      // Images : upload en parallele, limite a 5 au total
      const current = pageMedia[pageKey].images;
      const remaining = Math.max(0, 5 - current.length);
      const toUpload = arr.slice(0, remaining);
      if (arr.length > remaining) {
        setUploadError(`Limite de 5 images atteinte — ${remaining} fichier(s) importe(s) sur ${arr.length}`);
        setTimeout(() => setUploadError(null), 5000);
      }

      const results = await Promise.all(toUpload.map((f) => uploadSingleFile(f, "image")));
      const urls = results.filter((u): u is string => !!u);
      if (urls.length > 0) {
        updatePageMedia(pageKey, { images: [...current, ...urls] });
      }
    } finally {
      setIsUploading(false);
      setPendingUploadPage(null);
    }
  }

  // ── Galerie : upload bulk (images + videos, multi-select) ──
  async function handleGalleryBulkUpload(files: FileList) {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      // On determine le type par le MIME
      const uploads = arr.map(async (f) => {
        const kind: "image" | "video" = f.type.startsWith("video/") ? "video" : "image";
        const url = await uploadSingleFile(f, kind);
        return url ? { url, caption: "" } : null;
      });
      const results = await Promise.all(uploads);
      const newPhotos = results.filter((p): p is { url: string; caption: string } => !!p);
      if (newPhotos.length > 0) {
        const current = (getConfig("MOD_GALERIE")?.photos || []) as { url: string; caption: string }[];
        updateModuleConfig("MOD_GALERIE", { photos: [...current, ...newPhotos] });
      }
    } finally {
      setIsUploading(false);
    }
  }

  function removePageMediaImage(pageKey: PageKey, index: number) {
    const current = [...pageMedia[pageKey].images];
    current.splice(index, 1);
    updatePageMedia(pageKey, { images: current });
  }

  function removePageMediaVideo(pageKey: PageKey) {
    updatePageMedia(pageKey, { video: null });
  }

  // ── Programme helpers ──
  const programmeConfig = getConfig("MOD_PROGRAMME");
  const programmeDays = programmeConfig?.days || [{ label: "Jour 1", items: [] }];

  // Icones communs pour les etapes du programme — etendable
  const PROGRAMME_ICONS = ["🎉", "💒", "⛪", "🏛️", "🎤", "🍽️", "🥂", "💃", "🎂", "📸", "🎁", "🚗", "🎵", "✨"];

  // Liste d'adresses deja utilisees pour l'autocompletion (lieu principal + items existants)
  const programmeAddressSuggestions = useMemo(() => {
    const set = new Set<string>();
    if (location) set.add(location);
    for (const day of programmeDays) {
      for (const it of (day.items || []) as { location?: string; address?: string }[]) {
        if (it.address) set.add(it.address);
        if (it.location) set.add(it.location);
      }
    }
    return Array.from(set);
  }, [location, programmeDays]);

  function addProgrammeItem(dayIndex: number) {
    const newDays = [...programmeDays];
    if (!newDays[dayIndex].items) newDays[dayIndex].items = [];
    newDays[dayIndex].items.push({ time: "", endTime: "", title: "", description: "", icon: "🎉", location: "", address: "" });
    updateModuleConfig("MOD_PROGRAMME", { days: newDays });
  }

  function updateProgrammeItem(dayIndex: number, itemIndex: number, field: string, value: string) {
    const newDays = [...programmeDays];
    newDays[dayIndex].items[itemIndex][field] = value;
    updateModuleConfig("MOD_PROGRAMME", { days: newDays });
  }

  function removeProgrammeItem(dayIndex: number, itemIndex: number) {
    const newDays = [...programmeDays];
    newDays[dayIndex].items.splice(itemIndex, 1);
    updateModuleConfig("MOD_PROGRAMME", { days: newDays });
  }

  // ── Menu & Infos attaches a une etape du programme ──
  function patchProgrammeItem(dayIndex: number, itemIndex: number, patch: Record<string, unknown>) {
    const newDays = [...programmeDays];
    newDays[dayIndex].items[itemIndex] = { ...newDays[dayIndex].items[itemIndex], ...patch };
    updateModuleConfig("MOD_PROGRAMME", { days: newDays });
  }

  // Menu de l'etape
  function addItemMenuCourse(dayIdx: number, itemIdx: number) {
    const item = programmeDays[dayIdx].items[itemIdx];
    const menu: ItemMenu = item.menu || { courses: [] };
    patchProgrammeItem(dayIdx, itemIdx, { menu: { ...menu, courses: [...menu.courses, { name: "", items: [""], icon: "🍽️" }] } });
  }
  function updateItemMenuCourse(dayIdx: number, itemIdx: number, courseIdx: number, field: "name" | "icon", value: string) {
    const item = programmeDays[dayIdx].items[itemIdx];
    const menu: ItemMenu = item.menu || { courses: [] };
    const courses = [...menu.courses];
    courses[courseIdx] = { ...courses[courseIdx], [field]: value };
    patchProgrammeItem(dayIdx, itemIdx, { menu: { ...menu, courses } });
  }
  function removeItemMenuCourse(dayIdx: number, itemIdx: number, courseIdx: number) {
    const item = programmeDays[dayIdx].items[itemIdx];
    const menu: ItemMenu | undefined = item.menu;
    if (!menu) return;
    const courses = [...menu.courses];
    courses.splice(courseIdx, 1);
    patchProgrammeItem(dayIdx, itemIdx, { menu: courses.length ? { ...menu, courses } : undefined });
  }
  function addItemMenuCourseItem(dayIdx: number, itemIdx: number, courseIdx: number) {
    const item = programmeDays[dayIdx].items[itemIdx];
    const menu: ItemMenu = item.menu || { courses: [] };
    const courses = [...menu.courses];
    courses[courseIdx] = { ...courses[courseIdx], items: [...(courses[courseIdx].items || []), ""] };
    patchProgrammeItem(dayIdx, itemIdx, { menu: { ...menu, courses } });
  }
  function updateItemMenuCourseItem(dayIdx: number, itemIdx: number, courseIdx: number, miIdx: number, value: string) {
    const item = programmeDays[dayIdx].items[itemIdx];
    const menu: ItemMenu = item.menu || { courses: [] };
    const courses = [...menu.courses];
    const items = [...(courses[courseIdx].items || [])];
    items[miIdx] = value;
    courses[courseIdx] = { ...courses[courseIdx], items };
    patchProgrammeItem(dayIdx, itemIdx, { menu: { ...menu, courses } });
  }
  function removeItemMenuCourseItem(dayIdx: number, itemIdx: number, courseIdx: number, miIdx: number) {
    const item = programmeDays[dayIdx].items[itemIdx];
    const menu: ItemMenu | undefined = item.menu;
    if (!menu) return;
    const courses = [...menu.courses];
    const items = [...(courses[courseIdx].items || [])];
    items.splice(miIdx, 1);
    courses[courseIdx] = { ...courses[courseIdx], items };
    patchProgrammeItem(dayIdx, itemIdx, { menu: { ...menu, courses } });
  }

  // Infos / instructions de l'etape
  function addItemInfosSection(dayIdx: number, itemIdx: number) {
    const item = programmeDays[dayIdx].items[itemIdx];
    const infos: ItemInfos = item.infos || { sections: [] };
    patchProgrammeItem(dayIdx, itemIdx, { infos: { sections: [...infos.sections, { title: "", icon: "ℹ️", description: "", items: [] }] } });
  }
  function updateItemInfosSection(dayIdx: number, itemIdx: number, sIdx: number, field: "title" | "icon" | "description", value: string) {
    const item = programmeDays[dayIdx].items[itemIdx];
    const infos: ItemInfos = item.infos || { sections: [] };
    const sections = [...infos.sections];
    sections[sIdx] = { ...sections[sIdx], [field]: value };
    patchProgrammeItem(dayIdx, itemIdx, { infos: { sections } });
  }
  function removeItemInfosSection(dayIdx: number, itemIdx: number, sIdx: number) {
    const item = programmeDays[dayIdx].items[itemIdx];
    const infos: ItemInfos | undefined = item.infos;
    if (!infos) return;
    const sections = [...infos.sections];
    sections.splice(sIdx, 1);
    patchProgrammeItem(dayIdx, itemIdx, { infos: sections.length ? { sections } : undefined });
  }
  function addItemInfosSectionItem(dayIdx: number, itemIdx: number, sIdx: number) {
    const item = programmeDays[dayIdx].items[itemIdx];
    const infos: ItemInfos = item.infos || { sections: [] };
    const sections = [...infos.sections];
    sections[sIdx] = { ...sections[sIdx], items: [...(sections[sIdx].items || []), ""] };
    patchProgrammeItem(dayIdx, itemIdx, { infos: { sections } });
  }
  function updateItemInfosSectionItem(dayIdx: number, itemIdx: number, sIdx: number, miIdx: number, value: string) {
    const item = programmeDays[dayIdx].items[itemIdx];
    const infos: ItemInfos = item.infos || { sections: [] };
    const sections = [...infos.sections];
    const items = [...(sections[sIdx].items || [])];
    items[miIdx] = value;
    sections[sIdx] = { ...sections[sIdx], items };
    patchProgrammeItem(dayIdx, itemIdx, { infos: { sections } });
  }
  function removeItemInfosSectionItem(dayIdx: number, itemIdx: number, sIdx: number, miIdx: number) {
    const item = programmeDays[dayIdx].items[itemIdx];
    const infos: ItemInfos | undefined = item.infos;
    if (!infos) return;
    const sections = [...infos.sections];
    const items = [...(sections[sIdx].items || [])];
    items.splice(miIdx, 1);
    sections[sIdx] = { ...sections[sIdx], items };
    patchProgrammeItem(dayIdx, itemIdx, { infos: { sections } });
  }

  // True si au moins une etape du programme utilise deja menu/infos (pour masquer les modules standalone)
  const hasPerItemMenu = useMemo(() => {
    for (const day of programmeDays) {
      for (const it of (day.items || []) as { menu?: ItemMenu }[]) {
        if (it.menu && Array.isArray(it.menu.courses) && it.menu.courses.length > 0) return true;
      }
    }
    return false;
  }, [programmeDays]);
  const hasPerItemInfos = useMemo(() => {
    for (const day of programmeDays) {
      for (const it of (day.items || []) as { infos?: ItemInfos }[]) {
        if (it.infos && Array.isArray(it.infos.sections) && it.infos.sections.length > 0) return true;
      }
    }
    return false;
  }, [programmeDays]);

  // ── Menu helpers ──
  const menuConfig = getConfig("MOD_MENU");
  const menuSections = menuConfig?.sections || (menuConfig?.courses ? [{ label: "", courses: menuConfig.courses }] : []);
  const menuCourses = menuConfig?.courses || [];

  // Flat programme items for linking menus
  const allProgrammeItems = programmeDays.flatMap(
    (day: { items?: { time: string; title: string }[] }) =>
      (day.items || []).filter((it: { title: string }) => it.title)
  );

  function addMenuSection() {
    const newSections = [...menuSections, { label: "", programmeRef: "", courses: [{ name: "", items: [""], icon: "🍽️" }] }];
    updateModuleConfig("MOD_MENU", { sections: newSections, courses: undefined });
  }

  function updateMenuSectionLabel(sectionIdx: number, field: string, value: string) {
    const newSections = [...menuSections];
    newSections[sectionIdx][field] = value;
    updateModuleConfig("MOD_MENU", { sections: newSections });
  }

  function removeMenuSection(sectionIdx: number) {
    const newSections = [...menuSections];
    newSections.splice(sectionIdx, 1);
    updateModuleConfig("MOD_MENU", { sections: newSections });
  }

  function addMenuCourseInSection(sectionIdx: number) {
    const newSections = [...menuSections];
    newSections[sectionIdx].courses.push({ name: "", items: [""], icon: "🍽️" });
    updateModuleConfig("MOD_MENU", { sections: newSections });
  }

  function updateMenuCourseInSection(sectionIdx: number, courseIdx: number, field: string, value: string) {
    const newSections = [...menuSections];
    newSections[sectionIdx].courses[courseIdx][field] = value;
    updateModuleConfig("MOD_MENU", { sections: newSections });
  }

  function addMenuItemInSection(sectionIdx: number, courseIdx: number) {
    const newSections = [...menuSections];
    newSections[sectionIdx].courses[courseIdx].items.push("");
    updateModuleConfig("MOD_MENU", { sections: newSections });
  }

  function updateMenuItemInSection(sectionIdx: number, courseIdx: number, itemIdx: number, value: string) {
    const newSections = [...menuSections];
    newSections[sectionIdx].courses[courseIdx].items[itemIdx] = value;
    updateModuleConfig("MOD_MENU", { sections: newSections });
  }

  function removeMenuCourseInSection(sectionIdx: number, courseIdx: number) {
    const newSections = [...menuSections];
    newSections[sectionIdx].courses.splice(courseIdx, 1);
    updateModuleConfig("MOD_MENU", { sections: newSections });
  }

  // Legacy flat helpers (kept for backwards compat)
  function addMenuCourse() {
    const newCourses = [...menuCourses, { name: "", items: [""], icon: "🍽️" }];
    updateModuleConfig("MOD_MENU", { courses: newCourses });
  }

  function updateMenuCourse(courseIndex: number, field: string, value: string) {
    const newCourses = [...menuCourses];
    newCourses[courseIndex][field] = value;
    updateModuleConfig("MOD_MENU", { courses: newCourses });
  }

  function addMenuItem(courseIndex: number) {
    const newCourses = [...menuCourses];
    newCourses[courseIndex].items.push("");
    updateModuleConfig("MOD_MENU", { courses: newCourses });
  }

  function updateMenuItem(courseIndex: number, itemIndex: number, value: string) {
    const newCourses = [...menuCourses];
    newCourses[courseIndex].items[itemIndex] = value;
    updateModuleConfig("MOD_MENU", { courses: newCourses });
  }

  function removeMenuCourse(courseIndex: number) {
    const newCourses = [...menuCourses];
    newCourses.splice(courseIndex, 1);
    updateModuleConfig("MOD_MENU", { courses: newCourses });
  }

  // ── Logistics helpers ──
  const logConfig = getConfig("MOD_LOGISTIQUE");
  const logSections = logConfig?.sections || [];

  function addLogSection() {
    const newSections = [...logSections, { title: "", description: "", icon: "📍", items: [] }];
    updateModuleConfig("MOD_LOGISTIQUE", { sections: newSections });
  }

  function updateLogSection(idx: number, field: string, value: string) {
    const newSections = [...logSections];
    newSections[idx][field] = value;
    updateModuleConfig("MOD_LOGISTIQUE", { sections: newSections });
  }

  function removeLogSection(idx: number) {
    const newSections = [...logSections];
    newSections.splice(idx, 1);
    updateModuleConfig("MOD_LOGISTIQUE", { sections: newSections });
  }

  // ─── Styles ───
  const inputClass = "w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none transition focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20";
  const btnSecondary = "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800";
  const btnDanger = "inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition";

  // ─── Preview data (memoized) ──────────────────────────

  const activeModuleTypes = useMemo(
    () => modules.filter((m) => m.active).map((m) => m.type),
    [modules]
  );

  const modulesData = useMemo(() => {
    const getModConfig = (type: string): Record<string, unknown> | null => {
      const mod = modules.find((m) => m.type === type && m.active);
      return mod?.configJson as Record<string, unknown> || null;
    };
    return {
      programme: getModConfig("MOD_PROGRAMME"),
      menu: getModConfig("MOD_MENU"),
      logistics: getModConfig("MOD_LOGISTIQUE"),
      chat: getModConfig("MOD_CHAT"),
      gallery: getModConfig("MOD_GALERIE"),
      rsvp: getModConfig("MOD_RSVP"),
    };
  }, [modules]);

  // Preview page navigation: sync with current step
  const [previewPage, setPreviewPage] = useState(0);

  // Map editor steps to available preview pages
  const previewPagesAvailable = useMemo(() => {
    const pages: string[] = ["accueil"];
    if (activeModuleTypes.includes("MOD_PROGRAMME") || activeModuleTypes.includes("MOD_MENU")) {
      pages.push("evenement");
    }
    if (activeModuleTypes.includes("MOD_LOGISTIQUE") || activeModuleTypes.includes("MOD_GALERIE")) {
      pages.push("infos");
    }
    if (activeModuleTypes.includes("MOD_RSVP")) {
      pages.push("rsvp");
    }
    return pages;
  }, [activeModuleTypes]);

  // When step changes, try to navigate preview to matching page
  useEffect(() => {
    const stepId = STEPS[currentStep]?.id;
    if (!stepId) return;
    const pageIdx = previewPagesAvailable.indexOf(stepId);
    if (pageIdx >= 0) {
      setPreviewPage(pageIdx);
    } else {
      // If the target page doesn't exist in preview, go to closest
      setPreviewPage(0);
    }
  }, [currentStep, previewPagesAvailable]);

  // ─── Calculate preview scale ──────────────────────────
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  const recalcScale = useCallback(() => {
    if (!previewContainerRef.current) return;
    const containerH = previewContainerRef.current.clientHeight - 80; // header space
    const containerW = previewContainerRef.current.clientWidth - 48; // padding
    const scaleH = containerH / selectedDevice.height;
    const scaleW = containerW / selectedDevice.width;
    setPreviewScale(Math.min(scaleH, scaleW, 1));
  }, [selectedDevice]);

  useEffect(() => {
    recalcScale();
    window.addEventListener("resize", recalcScale);
    return () => window.removeEventListener("resize", recalcScale);
  }, [recalcScale]);

  const previewEventData = useMemo(() => {
    // Première date valide pour l'affichage preview (fallback : today)
    const firstDate = dates.find(Boolean) || new Date().toISOString().slice(0, 10);
    return {
      id: event.id,
      slug: event.slug,
      title,
      type: event.type,
      date: new Date(firstDate).toISOString(),
      location: location || null,
      description: description || null,
      organizer: event.organizer,
      guestCount: event.guestCount,
      coverImage,
      coverVideo,
    };
  }, [event.id, event.slug, event.type, event.organizer, event.guestCount, title, dates, location, description, coverImage, coverVideo]);

  // ── Per-page media/theme editor helper (reusable across steps) ──
  const STEP_LABELS: Record<PageKey, string> = { accueil: "l'accueil", evenement: "l'événement", infos: "Infos & Moments", rsvp: "Confirmation" };

  function renderPageMediaEditor(pageKey: PageKey) {
    const media = pageMedia[pageKey];
    const themeOverride = pageThemes[pageKey];
    const label = STEP_LABELS[pageKey];

    return (
      <>
        {/* Per-page Media */}
        <EditorSection title="Fond de page" icon={<ImageIcon className="h-3.5 w-3.5 text-[#7A3A50]" />}>
          {media.video ? (
            <div className="relative group">
              <video src={media.video} className="w-full h-24 object-cover rounded-lg" controls />
              <button onClick={() => removePageMediaVideo(pageKey)} className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition" aria-label="Supprimer la vidéo">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              {media.images.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5">
                  {media.images.map((url, idx) => (
                    <div key={idx} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Slide ${idx + 1}`} className="w-full h-16 object-cover rounded-md" />
                      <button title="Supprimer" aria-label={`Supprimer l'image ${idx + 1}`} onClick={() => removePageMediaImage(pageKey, idx)} className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setPendingUploadPage(pageKey); pageMediaImageRef.current?.click(); }}
                  disabled={isUploading || media.images.length >= 5}
                  className="flex-1 flex flex-col items-center gap-1 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 p-3 text-gray-400 dark:text-gray-500 transition hover:border-[#7A3A50]/40 hover:text-[#7A3A50] disabled:opacity-40"
                >
                  {isUploading && pendingUploadPage === pageKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span className="text-[9px] font-medium">Image ({media.images.length}/5)</span>
                </button>
                <button
                  onClick={() => { setPendingUploadPage(pageKey); pageMediaVideoRef.current?.click(); }}
                  disabled={isUploading}
                  className="flex-1 flex flex-col items-center gap-1 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 p-3 text-gray-400 dark:text-gray-500 transition hover:border-[#7A3A50]/40 hover:text-[#7A3A50] disabled:opacity-40"
                >
                  <Video className="h-4 w-4" />
                  <span className="text-[9px] font-medium">Vidéo</span>
                </button>
              </div>
            </>
          )}
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            {media.images.length > 1 ? "Les images défilent automatiquement (carousel)" : "Ajoutez jusqu'à 5 images (carousel) ou 1 vidéo"}
          </p>
        </EditorSection>

        {/* Per-page Theme Override */}
        <EditorSection title={`Thème de ${label}`} icon={<Palette className="h-3.5 w-3.5 text-[#7A3A50]" />} defaultOpen={false}>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor={`theme-bg-${pageKey}`} className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Fond</label>
              <input id={`theme-bg-${pageKey}`} title="Couleur de fond" type="color" value={themeOverride?.colorBackground || theme.colors.background} onChange={(e) => updatePageTheme(pageKey, { ...themeOverride, colorBackground: e.target.value })} className="w-full h-8 rounded cursor-pointer border border-gray-200 dark:border-gray-700" />
            </div>
            <div>
              <label htmlFor={`theme-text-${pageKey}`} className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Texte</label>
              <input id={`theme-text-${pageKey}`} title="Couleur du texte" type="color" value={themeOverride?.colorText || theme.colors.text} onChange={(e) => updatePageTheme(pageKey, { ...themeOverride, colorText: e.target.value })} className="w-full h-8 rounded cursor-pointer border border-gray-200 dark:border-gray-700" />
            </div>
            <div>
              <label htmlFor={`theme-accent-${pageKey}`} className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Accent</label>
              <input id={`theme-accent-${pageKey}`} title="Couleur d'accent" type="color" value={themeOverride?.colorPrimary || theme.colors.primary} onChange={(e) => updatePageTheme(pageKey, { ...themeOverride, colorPrimary: e.target.value })} className="w-full h-8 rounded cursor-pointer border border-gray-200 dark:border-gray-700" />
            </div>
          </div>
          {themeOverride && (
            <button onClick={() => updatePageTheme(pageKey, null)} className="text-[10px] text-[#7A3A50] hover:underline">
              Réinitialiser au thème global
            </button>
          )}
        </EditorSection>

        {/* Upload error feedback */}
        {uploadError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2">
            <span className="text-red-500 text-sm">⚠️</span>
            <span className="text-xs text-red-600 dark:text-red-400 flex-1">{uploadError}</span>
            <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600" aria-label="Fermer l'erreur">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </>
    );
  }

  // ═════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 overflow-hidden -m-4 lg:-m-6 -mt-0 lg:-mt-6">
      {/* ═══════════ LEFT: Editor Panel ═══════════ */}
      <div className="w-full lg:w-[420px] xl:w-[460px] flex-shrink-0 flex flex-col border-r-0 lg:border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        {/* Editor Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-900 dark:text-white truncate flex items-center gap-2">
              <span>{STEPS[currentStep].icon}</span>
              {STEPS[currentStep].label}
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {STEPS[currentStep].desc}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={`/${event.slug}`}
              target="_blank"
              title="Prévisualiser l'événement"
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Eye className="h-3 w-3" />
              <ExternalLink className="h-2.5 w-2.5 opacity-50" />
            </a>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#7A3A50] px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-[#7A3A50]/25 transition hover:bg-[#6A2A40] disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saved ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isSaving ? "..." : saved ? "OK" : "Sauvegarder"}
            </button>
          </div>
        </div>

        {/* Editor Content (scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* ═══════════════ STEP 0 — ACCUEIL ═══════════════ */}
          {currentStep === 0 && (
            <>
              <EditorSection title="Titre de l'événement" icon="✏️">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`${inputClass} font-semibold`}
                  aria-label="Titre de l'événement"
                />
              </EditorSection>

              <EditorSection title="Description" icon="📝">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="Décrivez votre événement..."
                />
                <p className="text-right text-[10px] text-gray-400">{description.length} car.</p>
              </EditorSection>

              {/* ─── Dates multi-jour ─── */}
              <EditorSection title="Dates de l'événement" icon={<Calendar className="h-3.5 w-3.5 text-[#7A3A50]" />}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">
                    {dates.filter(Boolean).length} jour{dates.filter(Boolean).length > 1 ? "s" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={addDate}
                    className="flex items-center gap-1 rounded-md bg-[#7A3A50]/10 px-2 py-0.5 text-[10px] font-medium text-[#7A3A50] transition hover:bg-[#7A3A50]/20"
                  >
                    <Plus className="h-3 w-3" /> Ajouter un jour
                  </button>
                </div>
                <div className="space-y-1.5">
                  {dates.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7A3A50]/10 text-[10px] font-bold text-[#7A3A50]">
                        J{i + 1}
                      </div>
                      <input
                        type="date"
                        value={d}
                        onChange={(e) => updateDate(i, e.target.value)}
                        className={`${inputClass} flex-1`}
                        aria-label={`Date du jour ${i + 1}`}
                      />
                      {dates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDate(i)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                          aria-label={`Supprimer le jour ${i + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </EditorSection>

              {/* ─── Lieu principal (rétro-compat affichage) ─── */}
              <EditorSection title="Lieu principal" icon={<MapPin className="h-3.5 w-3.5 text-[#7A3A50]" />}>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={inputClass}
                  placeholder="Adresse principale (fallback)"
                  aria-label="Lieu principal"
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  Affiché si aucun lieu détaillé n&apos;est défini ci-dessous.
                </p>
              </EditorSection>

              {/* ─── Venues détaillées ─── */}
              <EditorSection title="Lieux & Programme" icon="📍">
                <VenuesEditor
                  venues={venues}
                  availableDates={dates.filter(Boolean)}
                  onChange={setVenues}
                  accentColor="#7A3A50"
                />
              </EditorSection>

              {/* ── Per-page Media & Theme ── */}
              {renderPageMediaEditor("accueil")}
            </>
          )}

          {/* ═══════════════ STEP 1 — L'ÉVÉNEMENT ═══════════════ */}
          {currentStep === 1 && (
            <>
              <EditorSection
                title="Programme"
                icon="📋"
                badge={<ModuleToggle active={getModule("MOD_PROGRAMME")?.active ?? false} onToggle={() => toggleModule("MOD_PROGRAMME")} />}
              >
                {getModule("MOD_PROGRAMME")?.active && (
                  <div className="space-y-2">
                    {(programmeDays as ProgrammeDayAdmin[]).map((day, dayIdx) => (
                      <div key={dayIdx}>
                        <label className="mb-1 block text-[11px] font-medium text-gray-500">
                          {programmeDays.length > 1 ? day.label || `Jour ${dayIdx + 1}` : "Éléments"}
                        </label>
                        <div className="space-y-2">
                          {(day.items || []).map((item, itemIdx) => (
                            <div key={itemIdx} className="rounded-lg border border-gray-100 dark:border-gray-800 p-2 space-y-1.5">
                              {/* Row 1: Icon + Title + Delete */}
                              <div className="flex gap-1.5 items-center">
                                <select
                                  value={item.icon || "🎉"}
                                  onChange={(e) => updateProgrammeItem(dayIdx, itemIdx, "icon", e.target.value)}
                                  className="h-8 w-10 shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center text-base cursor-pointer outline-none focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
                                  aria-label="Icône de l'étape"
                                  title="Choisir une icône"
                                >
                                  {PROGRAMME_ICONS.map((ic) => (
                                    <option key={ic} value={ic}>{ic}</option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => updateProgrammeItem(dayIdx, itemIdx, "title", e.target.value)}
                                  className={`${inputClass} flex-1 text-xs font-medium`}
                                  placeholder="Ex: Cérémonie religieuse"
                                  aria-label="Titre de l'étape"
                                />
                                <button onClick={() => removeProgrammeItem(dayIdx, itemIdx)} className={btnDanger} aria-label="Supprimer cet élément">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                              {/* Row 2: Start time → End time (native time picker) */}
                              <div className="flex gap-1.5 items-center">
                                <div className="relative flex-1">
                                  <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                                  <input
                                    type="time"
                                    value={item.time}
                                    onChange={(e) => updateProgrammeItem(dayIdx, itemIdx, "time", e.target.value)}
                                    className={`${inputClass} text-xs pl-7`}
                                    aria-label="Heure de début"
                                  />
                                </div>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">→</span>
                                <input
                                  type="time"
                                  value={item.endTime || ""}
                                  onChange={(e) => updateProgrammeItem(dayIdx, itemIdx, "endTime", e.target.value)}
                                  className={`${inputClass} flex-1 text-xs`}
                                  placeholder="Fin"
                                  aria-label="Heure de fin (optionnel)"
                                />
                              </div>
                              {/* Row 3: Location + Address with autocomplete */}
                              <div className="flex gap-1.5 items-center">
                                <div className="relative flex-1">
                                  <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                                  <input
                                    type="text"
                                    value={item.location || ""}
                                    onChange={(e) => updateProgrammeItem(dayIdx, itemIdx, "location", e.target.value)}
                                    className={`${inputClass} text-xs pl-7`}
                                    placeholder="Lieu (ex: Église Saint-Michel)"
                                    list="programme-addresses"
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={item.address || ""}
                                  onChange={(e) => updateProgrammeItem(dayIdx, itemIdx, "address", e.target.value)}
                                  className={`${inputClass} flex-1 text-xs`}
                                  placeholder="Adresse (optionnel)"
                                  list="programme-addresses"
                                />
                              </div>
                              {/* Row 4: Optional description (auto-expands if filled) */}
                              <details className="group" open={!!item.description}>
                                <summary className="text-[10px] text-gray-400 hover:text-[#7A3A50] cursor-pointer select-none list-none inline-flex items-center gap-1 group-open:mb-1.5">
                                  <Plus className="h-2.5 w-2.5 group-open:hidden" />
                                  <span className="group-open:hidden">Description</span>
                                  <span className="hidden group-open:inline">Description</span>
                                </summary>
                                <textarea
                                  value={item.description || ""}
                                  onChange={(e) => updateProgrammeItem(dayIdx, itemIdx, "description", e.target.value)}
                                  className={`${inputClass} text-xs resize-none`}
                                  placeholder="Détails supplémentaires (optionnel)"
                                  rows={2}
                                />
                              </details>

                              {/* Row 5: Menu de cette etape (optionnel) */}
                              <details className="group" open={!!(item.menu && item.menu.courses.length)}>
                                <summary className="text-[10px] text-gray-400 hover:text-[#7A3A50] cursor-pointer select-none list-none inline-flex items-center gap-1 group-open:mb-1.5">
                                  <Plus className="h-2.5 w-2.5 group-open:hidden" />
                                  <span>🍽️ Menu de cette étape</span>
                                </summary>
                                <div className="space-y-1.5 rounded-lg bg-gray-50/70 dark:bg-gray-800/30 p-2">
                                  {item.menu && item.menu.courses.length > 0 ? (
                                    item.menu.courses.map((course: ItemMenuCourse, courseIdx: number) => (
                                      <div key={courseIdx} className="rounded-md border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-1.5 space-y-1">
                                        <div className="flex gap-1.5 items-center">
                                          <select
                                            value={course.icon || "🍽️"}
                                            onChange={(e) => updateItemMenuCourse(dayIdx, itemIdx, courseIdx, "icon", e.target.value)}
                                            className="h-7 w-9 shrink-0 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center text-sm cursor-pointer outline-none"
                                            aria-label="Icône du plat"
                                          >
                                            {["🍽️","🥗","🍲","🍰","🥂","🧀","🍷","🍝","🍤","🍱","🥩"].map(ic => <option key={ic} value={ic}>{ic}</option>)}
                                          </select>
                                          <input
                                            type="text"
                                            value={course.name}
                                            onChange={(e) => updateItemMenuCourse(dayIdx, itemIdx, courseIdx, "name", e.target.value)}
                                            className={`${inputClass} flex-1 text-xs`}
                                            placeholder="Ex: Entrée"
                                          />
                                          <button onClick={() => removeItemMenuCourse(dayIdx, itemIdx, courseIdx)} className={btnDanger} aria-label="Supprimer ce plat">
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                        <div className="space-y-1 pl-2">
                                          {(course.items || []).map((mItem: string, miIdx: number) => (
                                            <div key={miIdx} className="flex gap-1.5 items-center">
                                              <input
                                                type="text"
                                                value={mItem}
                                                onChange={(e) => updateItemMenuCourseItem(dayIdx, itemIdx, courseIdx, miIdx, e.target.value)}
                                                className={`${inputClass} flex-1 text-xs`}
                                                placeholder={`Élément ${miIdx + 1}`}
                                              />
                                              {(course.items || []).length > 1 && (
                                                <button onClick={() => removeItemMenuCourseItem(dayIdx, itemIdx, courseIdx, miIdx)} className={btnDanger} aria-label="Supprimer">
                                                  <X className="h-3 w-3" />
                                                </button>
                                              )}
                                            </div>
                                          ))}
                                          <button onClick={() => addItemMenuCourseItem(dayIdx, itemIdx, courseIdx)} className="text-[10px] text-[#7A3A50] dark:text-[#C48B90] hover:underline">
                                            + Élément
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  ) : null}
                                  <button onClick={() => addItemMenuCourse(dayIdx, itemIdx)} className={`${btnSecondary} text-[10px] w-full justify-center`}>
                                    <Plus className="h-3 w-3" /> Ajouter un plat
                                  </button>
                                </div>
                              </details>

                              {/* Row 6: Infos complementaires de cette etape (optionnel) */}
                              <details className="group" open={!!(item.infos && item.infos.sections.length)}>
                                <summary className="text-[10px] text-gray-400 hover:text-[#7A3A50] cursor-pointer select-none list-none inline-flex items-center gap-1 group-open:mb-1.5">
                                  <Plus className="h-2.5 w-2.5 group-open:hidden" />
                                  <span>ℹ️ Infos / Instructions</span>
                                </summary>
                                <div className="space-y-1.5 rounded-lg bg-gray-50/70 dark:bg-gray-800/30 p-2">
                                  {item.infos && item.infos.sections.length > 0 ? (
                                    item.infos.sections.map((sec: ItemInfosSection, sIdx: number) => (
                                      <div key={sIdx} className="rounded-md border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-1.5 space-y-1">
                                        <div className="flex gap-1.5 items-center">
                                          <select
                                            value={sec.icon || "ℹ️"}
                                            onChange={(e) => updateItemInfosSection(dayIdx, itemIdx, sIdx, "icon", e.target.value)}
                                            className="h-7 w-9 shrink-0 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center text-sm cursor-pointer outline-none"
                                            aria-label="Icône de la section"
                                          >
                                            {["ℹ️","👗","🚗","🅿️","📍","🏨","🎁","🎶","⛔","⚠️","💡"].map(ic => <option key={ic} value={ic}>{ic}</option>)}
                                          </select>
                                          <input
                                            type="text"
                                            value={sec.title || ""}
                                            onChange={(e) => updateItemInfosSection(dayIdx, itemIdx, sIdx, "title", e.target.value)}
                                            className={`${inputClass} flex-1 text-xs`}
                                            placeholder="Ex: Dresscode"
                                          />
                                          <button onClick={() => removeItemInfosSection(dayIdx, itemIdx, sIdx)} className={btnDanger} aria-label="Supprimer cette section">
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                        <textarea
                                          value={sec.description || ""}
                                          onChange={(e) => updateItemInfosSection(dayIdx, itemIdx, sIdx, "description", e.target.value)}
                                          className={`${inputClass} text-xs resize-none`}
                                          placeholder="Description (optionnel)"
                                          rows={2}
                                        />
                                        <div className="space-y-1 pl-2">
                                          {(sec.items || []).map((it: string, miIdx: number) => (
                                            <div key={miIdx} className="flex gap-1.5 items-center">
                                              <input
                                                type="text"
                                                value={it}
                                                onChange={(e) => updateItemInfosSectionItem(dayIdx, itemIdx, sIdx, miIdx, e.target.value)}
                                                className={`${inputClass} flex-1 text-xs`}
                                                placeholder={`Point ${miIdx + 1}`}
                                              />
                                              <button onClick={() => removeItemInfosSectionItem(dayIdx, itemIdx, sIdx, miIdx)} className={btnDanger} aria-label="Supprimer ce point">
                                                <X className="h-3 w-3" />
                                              </button>
                                            </div>
                                          ))}
                                          <button onClick={() => addItemInfosSectionItem(dayIdx, itemIdx, sIdx)} className="text-[10px] text-[#7A3A50] dark:text-[#C48B90] hover:underline">
                                            + Point
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  ) : null}
                                  <button onClick={() => addItemInfosSection(dayIdx, itemIdx)} className={`${btnSecondary} text-[10px] w-full justify-center`}>
                                    <Plus className="h-3 w-3" /> Ajouter une section
                                  </button>
                                </div>
                              </details>
                            </div>
                          ))}
                        </div>
                        {/* Suggestions d'adresses partagees pour lieu + adresse des items */}
                        <datalist id="programme-addresses">
                          {programmeAddressSuggestions.map((addr) => (
                            <option key={addr} value={addr} />
                          ))}
                        </datalist>
                        <button
                          onClick={() => addProgrammeItem(dayIdx)}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 px-3 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 transition hover:border-[#7A3A50]/40 hover:text-[#7A3A50]"
                        >
                          <Plus className="h-3.5 w-3.5" /> Ajouter un élément
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </EditorSection>

              {/* Section Menu standalone : masquee si le menu est deja attache a une etape du programme */}
              {!hasPerItemMenu && (
              <EditorSection
                title="Menu"
                icon="🍽️"
                badge={<ModuleToggle active={getModule("MOD_MENU")?.active ?? false} onToggle={() => toggleModule("MOD_MENU")} />}
              >
                {getModule("MOD_MENU")?.active && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-2.5 py-1.5">
                      💡 Astuce : vous pouvez aussi attacher un menu directement à chaque étape du programme (ci-dessus, rubrique 🍽️).
                    </p>
                    {/* Tip: multiple menu sections */}
                    {allProgrammeItems.length > 1 && menuSections.length <= 1 && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-2.5 py-1.5">
                        💡 Vous avez plusieurs programmes — vous pouvez créer un menu différent pour chacun.
                      </p>
                    )}

                    {menuSections.length > 0 ? (
                      /* ── Multi-section menus ── */
                      menuSections.map((section: { label: string; programmeRef?: string; courses: { name: string; items: string[]; icon: string }[] }, sectionIdx: number) => (
                        <div key={sectionIdx} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-2.5 space-y-2">
                          {/* Section header */}
                          <div className="flex gap-1.5 items-center">
                            <input
                              type="text"
                              value={section.label || ""}
                              onChange={(e) => updateMenuSectionLabel(sectionIdx, "label", e.target.value)}
                              className={`${inputClass} flex-1 text-xs font-semibold`}
                              placeholder={menuSections.length > 1 ? `Menu ${sectionIdx + 1} (ex: Cocktail)` : "Titre du menu (optionnel)"}
                            />
                            {menuSections.length > 1 && (
                              <button onClick={() => removeMenuSection(sectionIdx)} className={btnDanger} aria-label="Supprimer ce menu">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          {/* Lier ce menu a une etape du programme */}
                          {allProgrammeItems.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400 shrink-0">🔗 Rattaché à</span>
                              <select
                                value={section.programmeRef || ""}
                                onChange={(e) => updateMenuSectionLabel(sectionIdx, "programmeRef", e.target.value)}
                                className={`${inputClass} flex-1 text-[11px]`}
                                aria-label="Rattacher ce menu à une étape du programme"
                              >
                                <option value="">{allProgrammeItems.length > 1 ? "— Tout le programme —" : "— Aucune étape —"}</option>
                                {allProgrammeItems.map((pi: { time: string; title: string }, piIdx: number) => (
                                  <option key={piIdx} value={pi.title}>
                                    {pi.time ? `${pi.time} — ` : ""}{pi.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Courses in this section */}
                          {section.courses.map((course: { name: string; items: string[]; icon: string }, courseIdx: number) => (
                            <div key={courseIdx} className="rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-2">
                              <div className="flex gap-1.5 items-center mb-1">
                                <input
                                  type="text"
                                  value={course.name}
                                  onChange={(e) => updateMenuCourseInSection(sectionIdx, courseIdx, "name", e.target.value)}
                                  className={`${inputClass} flex-1 text-xs`}
                                  placeholder="Nom du plat"
                                />
                                <button onClick={() => removeMenuCourseInSection(sectionIdx, courseIdx)} className={btnDanger} aria-label="Supprimer ce plat">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                              <div className="space-y-1 pl-2">
                                {course.items.map((item: string, itemIdx: number) => (
                                  <input
                                    key={itemIdx}
                                    type="text"
                                    value={item}
                                    onChange={(e) => updateMenuItemInSection(sectionIdx, courseIdx, itemIdx, e.target.value)}
                                    className={`${inputClass} text-xs`}
                                    placeholder={`Élément ${itemIdx + 1}`}
                                  />
                                ))}
                                <button onClick={() => addMenuItemInSection(sectionIdx, courseIdx)} className="text-[10px] text-[#7A3A50] dark:text-[#C48B90] hover:underline">
                                  + Élément
                                </button>
                              </div>
                            </div>
                          ))}
                          <button onClick={() => addMenuCourseInSection(sectionIdx)} className={`${btnSecondary} text-[10px]`}>
                            <Plus className="h-3 w-3" /> Ajouter un plat
                          </button>
                        </div>
                      ))
                    ) : (
                      /* ── Legacy flat menu (no sections yet) ── */
                      menuCourses.map((course: { name: string; items: string[]; icon: string }, courseIdx: number) => (
                        <div key={courseIdx} className="rounded-lg border border-gray-100 dark:border-gray-800 p-2.5">
                          <div className="flex gap-1.5 items-center mb-1.5">
                            <input
                              type="text"
                              value={course.name}
                              onChange={(e) => updateMenuCourse(courseIdx, "name", e.target.value)}
                              className={`${inputClass} flex-1 text-xs`}
                              placeholder="Nom du plat"
                            />
                            <button onClick={() => removeMenuCourse(courseIdx)} className={btnDanger} aria-label="Supprimer ce plat">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="space-y-1 pl-2">
                            {course.items.map((item: string, itemIdx: number) => (
                              <input
                                key={itemIdx}
                                type="text"
                                value={item}
                                onChange={(e) => updateMenuItem(courseIdx, itemIdx, e.target.value)}
                                className={`${inputClass} text-xs`}
                                placeholder={`Élément ${itemIdx + 1}`}
                              />
                            ))}
                            <button onClick={() => addMenuItem(courseIdx)} className="text-[10px] text-[#7A3A50] dark:text-[#C48B90] hover:underline">
                              + Élément
                            </button>
                          </div>
                        </div>
                      ))
                    )}

                    <div className="flex gap-2">
                      {menuSections.length > 0 ? (
                        <button onClick={addMenuSection} className={`${btnSecondary} text-[11px]`}>
                          <Plus className="h-3 w-3" /> Ajouter un type de menu
                        </button>
                      ) : (
                        <>
                          <button onClick={addMenuCourse} className={`${btnSecondary} text-[11px]`}>
                            <Plus className="h-3 w-3" /> Ajouter un plat
                          </button>
                          {allProgrammeItems.length > 1 && (
                            <button onClick={addMenuSection} className={`${btnSecondary} text-[11px] text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700`}>
                              <Plus className="h-3 w-3" /> Menu par programme
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </EditorSection>
              )}

              {/* ── Per-page Media & Theme ── */}
              {renderPageMediaEditor("evenement")}
            </>
          )}

          {/* ═══════════════ STEP 2 — INFOS & MOMENTS ═══════════════ */}
          {currentStep === 2 && (
            <>
              {/* Infos pratiques standalone : masquees si deja attachees a une etape du programme */}
              {!hasPerItemInfos && (
              <EditorSection
                title="Infos pratiques"
                icon="🚗"
                badge={<ModuleToggle active={getModule("MOD_LOGISTIQUE")?.active ?? false} onToggle={() => toggleModule("MOD_LOGISTIQUE")} />}
              >
                {getModule("MOD_LOGISTIQUE")?.active && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-2.5 py-1.5">
                      💡 Astuce : vous pouvez aussi ajouter des infos/instructions directement sur chaque étape du programme (rubrique ℹ️).
                    </p>
                    {logSections.map((section: { title: string; description: string; icon: string }, idx: number) => (
                      <div key={idx} className="rounded-lg border border-gray-100 dark:border-gray-800 p-2.5">
                        <div className="flex gap-1.5 items-center mb-1.5">
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => updateLogSection(idx, "title", e.target.value)}
                            className={`${inputClass} flex-1 text-xs`}
                            placeholder="Titre (ex: Transport)"
                          />
                          <button onClick={() => removeLogSection(idx)} className={btnDanger} aria-label="Supprimer cette section">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <textarea
                          value={section.description || ""}
                          onChange={(e) => updateLogSection(idx, "description", e.target.value)}
                          className={`${inputClass} text-xs resize-none`}
                          rows={2}
                          placeholder="Description..."
                        />
                      </div>
                    ))}
                    <button onClick={addLogSection} className={`${btnSecondary} text-[11px]`}>
                      <Plus className="h-3 w-3" /> Ajouter une section
                    </button>
                  </div>
                )}
              </EditorSection>
              )}

              <EditorSection
                title="Galerie"
                icon="📷"
                badge={<ModuleToggle active={getModule("MOD_GALERIE")?.active ?? false} onToggle={() => toggleModule("MOD_GALERIE")} />}
              >
                {getModule("MOD_GALERIE")?.active && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      Importez vos photos et vidéos, ou collez des URLs.
                    </p>
                    {/* Bouton principal : import multi-selection */}
                    <button
                      onClick={() => galleryUploadRef.current?.click()}
                      disabled={isUploading}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 px-3 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 transition hover:border-[#7A3A50]/40 hover:text-[#7A3A50] disabled:opacity-50"
                    >
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span>Importer des photos / vidéos (multi-sélection)</span>
                    </button>
                    {((getConfig("MOD_GALERIE")?.photos || []) as { url: string; caption: string }[]).length > 0 && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1">
                        {((getConfig("MOD_GALERIE")?.photos || []) as { url: string; caption: string }[]).length} média{((getConfig("MOD_GALERIE")?.photos || []) as { url: string; caption: string }[]).length > 1 ? "s" : ""} dans la galerie
                      </p>
                    )}
                    {((getConfig("MOD_GALERIE")?.photos || []) as { url: string; caption: string }[]).map((photo: { url: string; caption: string }, idx: number) => (
                      <div key={idx} className="flex gap-1.5 items-center">
                        <input
                          type="url"
                          value={photo.url || ""}
                          onChange={(e) => {
                            const photos = [...(getConfig("MOD_GALERIE")?.photos || [])];
                            photos[idx] = { ...photos[idx], url: e.target.value };
                            updateModuleConfig("MOD_GALERIE", { photos });
                          }}
                          className={`${inputClass} flex-1 text-xs`}
                          placeholder="URL"
                        />
                        <input
                          type="text"
                          value={photo.caption || ""}
                          onChange={(e) => {
                            const photos = [...(getConfig("MOD_GALERIE")?.photos || [])];
                            photos[idx] = { ...photos[idx], caption: e.target.value };
                            updateModuleConfig("MOD_GALERIE", { photos });
                          }}
                          className={`${inputClass} w-20 text-xs`}
                          placeholder="Légende"
                        />
                        <button
                          onClick={() => {
                            const photos = [...(getConfig("MOD_GALERIE")?.photos || [])];
                            photos.splice(idx, 1);
                            updateModuleConfig("MOD_GALERIE", { photos });
                          }}
                          className={btnDanger}
                          aria-label="Supprimer cette photo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const photos = [...(getConfig("MOD_GALERIE")?.photos || []), { url: "", caption: "" }];
                        updateModuleConfig("MOD_GALERIE", { photos });
                      }}
                      className={`${btnSecondary} text-[11px]`}
                    >
                      <Plus className="h-3 w-3" /> Ajouter une photo
                    </button>
                  </div>
                )}
              </EditorSection>

              {/* ── Per-page Media & Theme ── */}
              {renderPageMediaEditor("infos")}
            </>
          )}

          {/* ═══════════════ STEP 3 — CONFIRMATION ═══════════════ */}
          {currentStep === 3 && (
            <>
              <EditorSection
                title="Confirmation (RSVP)"
                icon="✅"
                badge={<ModuleToggle active={getModule("MOD_RSVP")?.active ?? false} onToggle={() => toggleModule("MOD_RSVP")} />}
              >
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Active le formulaire de confirmation de présence. Les invités pourront confirmer, choisir leur menu et recevoir leur QR code.
                </p>

                {getModule("MOD_RSVP")?.active && (
                  <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    {/* Allow children toggle */}
                    <div className="flex items-center justify-between rounded-lg bg-gray-50/50 dark:bg-gray-800/30 px-3 py-2.5">
                      <div>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">👶 Autoriser les enfants</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">
                          {getConfig("MOD_RSVP")?.allowChildren !== false
                            ? "Les invités peuvent ajouter des enfants"
                            : "Le champ enfants est masqué du formulaire"}
                        </p>
                      </div>
                      <ModuleToggle
                        active={getConfig("MOD_RSVP")?.allowChildren !== false}
                        onToggle={() => {
                          const current = getConfig("MOD_RSVP");
                          updateModuleConfig("MOD_RSVP", {
                            ...current,
                            allowChildren: current?.allowChildren === false ? true : false,
                          });
                        }}
                      />
                    </div>
                    {/* RSVP deadline */}
                    <div className="rounded-lg bg-gray-50/50 dark:bg-gray-800/30 px-3 py-2.5 space-y-1.5">
                      <label htmlFor="rsvp-deadline" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        ⏰ Clôture des RSVP (optionnel)
                      </label>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        Les invités ne pourront plus confirmer après cette date.
                      </p>
                      <div className="flex gap-1.5 items-center">
                        <input
                          id="rsvp-deadline"
                          type="datetime-local"
                          value={rsvpDeadline}
                          onChange={(e) => setRsvpDeadline(e.target.value)}
                          className={`${inputClass} flex-1 text-xs`}
                        />
                        {rsvpDeadline && (
                          <button
                            onClick={() => setRsvpDeadline("")}
                            className={btnDanger}
                            aria-label="Supprimer la date limite"
                            title="Supprimer la date limite"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </EditorSection>

              <EditorSection
                title="Chat en direct"
                icon="💬"
                badge={<ModuleToggle active={getModule("MOD_CHAT")?.active ?? false} onToggle={() => toggleModule("MOD_CHAT")} />}
              >
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Active le chat en direct. Les invités peuvent envoyer des messages visibles par tous.
                </p>
              </EditorSection>

              {/* ── Per-page Media & Theme ── */}
              {renderPageMediaEditor("rsvp")}

              <div className="grid gap-3 grid-cols-2">
                <Link
                  href={`/events/${event.id}/theme`}
                  className="flex items-center gap-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 shadow-sm transition hover:border-[#7A3A50]/20 hover:shadow-md"
                >
                  <span className="text-lg">🎨</span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate">Thème global</h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Couleurs, polices</p>
                  </div>
                </Link>
                <Link
                  href={`/events/${event.id}/guests`}
                  className="flex items-center gap-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 shadow-sm transition hover:border-[#7A3A50]/20 hover:shadow-md"
                >
                  <span className="text-lg">👥</span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate">Invités</h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Ajouter, inviter</p>
                  </div>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hidden file inputs for per-page media uploads (multi-select pour les images) */}
      <input
        ref={pageMediaImageRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-label="Choisir des images de page"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0 && pendingUploadPage) handlePageMediaUpload(files, "image", pendingUploadPage);
          e.target.value = "";
        }}
      />
      <input
        ref={pageMediaVideoRef}
        type="file"
        accept="video/*"
        className="hidden"
        aria-label="Choisir une vidéo de page"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0 && pendingUploadPage) handlePageMediaUpload(files, "video", pendingUploadPage);
          e.target.value = "";
        }}
      />
      {/* Hidden file input for Galerie bulk upload */}
      <input
        ref={galleryUploadRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        aria-label="Importer des photos et vidéos"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) handleGalleryBulkUpload(files);
          e.target.value = "";
        }}
      />

      {/* ═══════════ RIGHT: Live Mobile Preview ═══════════ */}
      <div
        ref={previewContainerRef}
        className="hidden lg:flex flex-1 flex-col bg-gradient-to-br from-gray-50 via-gray-100/50 to-gray-50 dark:from-gray-900 dark:via-gray-800/30 dark:to-gray-900 overflow-hidden"
      >
        {/* Device Switcher Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200/50 dark:border-gray-700/30 bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#7A3A50] animate-pulse" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Aperçu en direct</span>
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
              {selectedDevice.width}×{selectedDevice.height}
            </span>
          </div>
          <DeviceSwitcher
            selected={selectedDevice}
            onSelect={(d) => setSelectedDevice(d)}
          />
        </div>

        {/* Preview Content — centered */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
          <DevicePreviewFrame device={selectedDevice} scale={previewScale}>
            <InvitationCard
              event={previewEventData}
              theme={{ ...theme, pageMedia, pageThemes }}
              activeModules={activeModuleTypes}
              modulesData={modulesData}
              chatMessages={[]}
              guestInfo={null}
              initialPage={previewPage}
            />
          </DevicePreviewFrame>
        </div>
      </div>
    </div>
  );
}
