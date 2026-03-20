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
    location: string | null;
    coverImage: string | null;
    coverVideo: string | null;
    type: string;
    organizer: string | null;
    guestCount: number;
    modules: ModuleData[];
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
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
        style={{ left: active ? "18px" : "2px" }}
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
  const [date, setDate] = useState(event.date.split("T")[0]);
  const [location, setLocation] = useState(event.location || "");
  const [coverImage, setCoverImage] = useState(event.coverImage);
  const [coverVideo, setCoverVideo] = useState(event.coverVideo);

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
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    setIsSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          date,
          location: location || null,
        }),
      });

      if (modules.length > 0) {
        await fetch(`/api/events/${event.id}/modules`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modules }),
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpload(file: File, type: "image" | "video") {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type === "image" ? "cover" : "video");

      const res = await fetch(`/api/events/${event.id}`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (type === "image") setCoverImage(data.url);
        else setCoverVideo(data.url);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemoveMedia(type: "image" | "video") {
    try {
      const field = type === "image" ? "coverImage" : "coverVideo";
      await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: null }),
      });
      if (type === "image") setCoverImage(null);
      else setCoverVideo(null);
    } catch (error) {
      console.error("Remove media error:", error);
    }
  }

  // ── Programme helpers ──
  const programmeConfig = getConfig("MOD_PROGRAMME");
  const programmeDays = programmeConfig?.days || [{ label: "Jour 1", items: [] }];

  function addProgrammeItem(dayIndex: number) {
    const newDays = [...programmeDays];
    if (!newDays[dayIndex].items) newDays[dayIndex].items = [];
    newDays[dayIndex].items.push({ time: "", title: "", description: "", icon: "🎉" });
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

  // ── Menu helpers ──
  const menuConfig = getConfig("MOD_MENU");
  const menuCourses = menuConfig?.courses || [];

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

  const previewEventData = useMemo(() => ({
    id: event.id,
    slug: event.slug,
    title,
    type: event.type,
    date: new Date(date).toISOString(),
    location: location || null,
    description: description || null,
    organizer: event.organizer,
    guestCount: event.guestCount,
    coverImage,
    coverVideo,
  }), [event.id, event.slug, event.type, event.organizer, event.guestCount, title, date, location, description, coverImage, coverVideo]);

  // ═════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 overflow-hidden -m-6 lg:-m-8">
      {/* ═══════════ LEFT: Editor Panel ═══════════ */}
      <div className="w-full lg:w-[420px] xl:w-[460px] flex-shrink-0 flex flex-col border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
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

              <EditorSection title="Date & Lieu" icon={<Calendar className="h-3.5 w-3.5 text-[#7A3A50]" />}>
                <div className="grid gap-3 grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      <Clock className="inline h-3 w-3 mr-0.5" />Date
                    </label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} aria-label="Date de l'événement" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      <MapPin className="inline h-3 w-3 mr-0.5" />Lieu
                    </label>
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="Adresse..." />
                  </div>
                </div>
              </EditorSection>

              {/* Cover Media */}
              <div className="grid gap-3 grid-cols-2">
                <EditorSection title="Image" icon={<ImageIcon className="h-3.5 w-3.5 text-[#7A3A50]" />}>
                  {coverImage ? (
                    <div className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverImage} alt="Cover" className="w-full h-24 object-cover rounded-lg" />
                      <button
                        onClick={() => handleRemoveMedia("image")}
                        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                        aria-label="Supprimer l'image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => imageRef.current?.click()}
                      disabled={isUploading}
                      className="flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 text-gray-400 dark:text-gray-500 transition hover:border-[#7A3A50]/40 hover:text-[#7A3A50]"
                    >
                      {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                      <span className="text-[10px] font-medium">{isUploading ? "Upload..." : "Choisir"}</span>
                    </button>
                  )}
                  <input ref={imageRef} type="file" accept="image/*" className="hidden" aria-label="Choisir une image" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "image"); }} />
                </EditorSection>

                <EditorSection title="Vidéo" icon={<Video className="h-3.5 w-3.5 text-[#7A3A50]" />}>
                  {coverVideo ? (
                    <div className="relative group">
                      <video src={coverVideo} className="w-full h-24 object-cover rounded-lg" controls />
                      <button
                        onClick={() => handleRemoveMedia("video")}
                        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                        aria-label="Supprimer la vidéo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => videoRef.current?.click()}
                      disabled={isUploading}
                      className="flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 text-gray-400 dark:text-gray-500 transition hover:border-[#7A3A50]/40 hover:text-[#7A3A50]"
                    >
                      {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                      <span className="text-[10px] font-medium">{isUploading ? "Upload..." : "Choisir"}</span>
                    </button>
                  )}
                  <input ref={videoRef} type="file" accept="video/*" className="hidden" aria-label="Choisir une vidéo" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "video"); }} />
                </EditorSection>
              </div>
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
                    {programmeDays.map((day: { label: string; items: { time: string; title: string; description: string; icon: string }[] }, dayIdx: number) => (
                      <div key={dayIdx}>
                        <label className="mb-1 block text-[11px] font-medium text-gray-500">
                          {programmeDays.length > 1 ? day.label || `Jour ${dayIdx + 1}` : "Éléments"}
                        </label>
                        <div className="space-y-1.5">
                          {(day.items || []).map((item: { time: string; title: string; description: string; icon: string }, itemIdx: number) => (
                            <div key={itemIdx} className="flex gap-1.5 items-start">
                              <input
                                type="text"
                                value={item.time}
                                onChange={(e) => updateProgrammeItem(dayIdx, itemIdx, "time", e.target.value)}
                                className={`${inputClass} w-16 text-xs`}
                                placeholder="14:00"
                              />
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => updateProgrammeItem(dayIdx, itemIdx, "title", e.target.value)}
                                className={`${inputClass} flex-1 text-xs`}
                                placeholder="Titre"
                              />
                              <button onClick={() => removeProgrammeItem(dayIdx, itemIdx)} className={btnDanger} aria-label="Supprimer cet élément">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => addProgrammeItem(dayIdx)} className={`${btnSecondary} mt-1.5 text-[11px]`}>
                          <Plus className="h-3 w-3" /> Ajouter
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </EditorSection>

              <EditorSection
                title="Menu"
                icon="🍽️"
                badge={<ModuleToggle active={getModule("MOD_MENU")?.active ?? false} onToggle={() => toggleModule("MOD_MENU")} />}
              >
                {getModule("MOD_MENU")?.active && (
                  <div className="space-y-2">
                    {menuCourses.map((course: { name: string; items: string[]; icon: string }, courseIdx: number) => (
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
                    ))}
                    <button onClick={addMenuCourse} className={`${btnSecondary} text-[11px]`}>
                      <Plus className="h-3 w-3" /> Ajouter un plat
                    </button>
                  </div>
                )}
              </EditorSection>
            </>
          )}

          {/* ═══════════════ STEP 2 — INFOS & MOMENTS ═══════════════ */}
          {currentStep === 2 && (
            <>
              <EditorSection
                title="Infos pratiques"
                icon="🚗"
                badge={<ModuleToggle active={getModule("MOD_LOGISTIQUE")?.active ?? false} onToggle={() => toggleModule("MOD_LOGISTIQUE")} />}
              >
                {getModule("MOD_LOGISTIQUE")?.active && (
                  <div className="space-y-2">
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

              <EditorSection
                title="Galerie"
                icon="📷"
                badge={<ModuleToggle active={getModule("MOD_GALERIE")?.active ?? false} onToggle={() => toggleModule("MOD_GALERIE")} />}
              >
                {getModule("MOD_GALERIE")?.active && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      Ajoutez des URLs d&apos;images.
                    </p>
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

              <div className="grid gap-3 grid-cols-2">
                <Link
                  href={`/events/${event.id}/theme`}
                  className="flex items-center gap-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 shadow-sm transition hover:border-[#7A3A50]/20 hover:shadow-md"
                >
                  <span className="text-lg">🎨</span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate">Thème</h4>
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
              theme={theme}
              activeModules={activeModuleTypes}
              modulesData={modulesData}
              chatMessages={[]}
              guestInfo={null}
              // @ts-expect-error custom prop for preview page sync
              initialPage={previewPage}
            />
          </DevicePreviewFrame>
        </div>
      </div>
    </div>
  );
}
