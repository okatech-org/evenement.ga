"use client";

import { useState, useRef } from "react";
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
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────

interface ModuleData {
  id: string;
  type: string;
  active: boolean;
  order: number;
  configJson: Record<string, unknown>;
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
    modules: ModuleData[];
  };
}

// ─── Step definitions ───────────────────────────────────

const STEPS = [
  { id: "accueil", label: "Accueil", icon: "🏠", desc: "Titre, description, médias" },
  { id: "evenement", label: "L'événement", icon: "📋", desc: "Programme & Menu" },
  { id: "infos", label: "Infos & Moments", icon: "📍", desc: "Logistique & Galerie" },
  { id: "rsvp", label: "Confirmation", icon: "✅", desc: "RSVP & Paramètres" },
];

// ─── Component ──────────────────────────────────────────

export function EventEditClient({ event }: EventEditClientProps) {
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step");
  const currentStep = stepParam ? parseInt(stepParam, 10) : 0;

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
      // Save event details
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

      // Save modules
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

  // ─── Card style ───
  const cardClass = "rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm";
  const inputClass = "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 outline-none transition focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20";
  const labelClass = "mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400";
  const btnSecondary = "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800";
  const btnDanger = "inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {STEPS[currentStep].icon} {STEPS[currentStep].label}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {STEPS[currentStep].desc}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/${event.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Eye className="h-3.5 w-3.5" />
            Aperçu
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#7A3A50] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7A3A50]/25 transition hover:bg-[#6A2A40] disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Sauvegarde..." : saved ? "Sauvegardé !" : "Sauvegarder"}
          </button>
        </div>
      </div>



      {/* Step content */}
      <div className="space-y-5">
        {/* ═══════════════ STEP 1 — ACCUEIL ═══════════════ */}
        {currentStep === 0 && (
          <>
            {/* Title */}
            <div className={cardClass}>
              <label className={labelClass}>Titre de l&apos;événement</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`${inputClass} text-lg font-semibold`}
              />
            </div>

            {/* Description */}
            <div className={cardClass}>
              <label className={labelClass}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className={`${inputClass} resize-none`}
                placeholder="Décrivez votre événement..."
              />
              <p className="mt-1.5 text-right text-[11px] text-gray-400">{description.length} caractères</p>
            </div>

            {/* Date & Lieu */}
            <div className={cardClass}>
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#7A3A50] dark:text-[#C48B90]" />
                Date & Lieu
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    <Clock className="inline h-3 w-3 mr-1" />Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    <MapPin className="inline h-3 w-3 mr-1" />Lieu
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className={inputClass}
                    placeholder="Adresse ou nom du lieu"
                  />
                </div>
              </div>
            </div>

            {/* Cover Image & Video */}
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Image */}
              <div className={cardClass}>
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[#7A3A50] dark:text-[#C48B90]" />
                  Image de couverture
                </h3>
                {coverImage ? (
                  <div className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverImage} alt="Cover" className="w-full h-40 object-cover rounded-lg" />
                    <button
                      onClick={() => handleRemoveMedia("image")}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => imageRef.current?.click()}
                    disabled={isUploading}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-6 text-gray-400 dark:text-gray-500 transition hover:border-[#7A3A50]/40 hover:text-[#7A3A50]"
                  >
                    {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                    <span className="text-xs font-medium">{isUploading ? "Upload..." : "Choisir une image"}</span>
                  </button>
                )}
                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "image"); }} />
              </div>

              {/* Video */}
              <div className={cardClass}>
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Video className="h-4 w-4 text-[#7A3A50] dark:text-[#C48B90]" />
                  Vidéo de couverture
                </h3>
                {coverVideo ? (
                  <div className="relative group">
                    <video src={coverVideo} className="w-full h-40 object-cover rounded-lg" controls />
                    <button
                      onClick={() => handleRemoveMedia("video")}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => videoRef.current?.click()}
                    disabled={isUploading}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-6 text-gray-400 dark:text-gray-500 transition hover:border-[#7A3A50]/40 hover:text-[#7A3A50]"
                  >
                    {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                    <span className="text-xs font-medium">{isUploading ? "Upload..." : "Choisir une vidéo"}</span>
                  </button>
                )}
                <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "video"); }} />
              </div>
            </div>
          </>
        )}

        {/* ═══════════════ STEP 2 — L'ÉVÉNEMENT ═══════════════ */}
        {currentStep === 1 && (
          <>
            {/* Programme */}
            <div className={cardClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">📋 Programme</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500">{getModule("MOD_PROGRAMME")?.active ? "Actif" : "Inactif"}</span>
                  <button
                    onClick={() => toggleModule("MOD_PROGRAMME")}
                    className={`relative h-5 w-9 rounded-full transition ${getModule("MOD_PROGRAMME")?.active ? "bg-[#7A3A50]" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${getModule("MOD_PROGRAMME")?.active ? "left-4.5" : "left-0.5"}`} style={{ left: getModule("MOD_PROGRAMME")?.active ? "18px" : "2px" }} />
                  </button>
                </label>
              </div>

              {getModule("MOD_PROGRAMME")?.active && (
                <div className="space-y-3">
                  {programmeDays.map((day: { label: string; items: { time: string; title: string; description: string; icon: string }[] }, dayIdx: number) => (
                    <div key={dayIdx}>
                      <label className={labelClass}>
                        {programmeDays.length > 1 ? day.label || `Jour ${dayIdx + 1}` : "Éléments du programme"}
                      </label>
                      <div className="space-y-2">
                        {(day.items || []).map((item: { time: string; title: string; description: string; icon: string }, itemIdx: number) => (
                          <div key={itemIdx} className="flex gap-2 items-start">
                            <input
                              type="text"
                              value={item.time}
                              onChange={(e) => updateProgrammeItem(dayIdx, itemIdx, "time", e.target.value)}
                              className={`${inputClass} w-20`}
                              placeholder="14:00"
                            />
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => updateProgrammeItem(dayIdx, itemIdx, "title", e.target.value)}
                              className={`${inputClass} flex-1`}
                              placeholder="Titre"
                            />
                            <input
                              type="text"
                              value={item.description || ""}
                              onChange={(e) => updateProgrammeItem(dayIdx, itemIdx, "description", e.target.value)}
                              className={`${inputClass} flex-1 hidden sm:block`}
                              placeholder="Description"
                            />
                            <button onClick={() => removeProgrammeItem(dayIdx, itemIdx)} className={btnDanger}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => addProgrammeItem(dayIdx)} className={`${btnSecondary} mt-2`}>
                        <Plus className="h-3.5 w-3.5" /> Ajouter
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Menu */}
            <div className={cardClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">🍽️ Menu</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500">{getModule("MOD_MENU")?.active ? "Actif" : "Inactif"}</span>
                  <button
                    onClick={() => toggleModule("MOD_MENU")}
                    className={`relative h-5 w-9 rounded-full transition ${getModule("MOD_MENU")?.active ? "bg-[#7A3A50]" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: getModule("MOD_MENU")?.active ? "18px" : "2px" }} />
                  </button>
                </label>
              </div>

              {getModule("MOD_MENU")?.active && (
                <div className="space-y-3">
                  {menuCourses.map((course: { name: string; items: string[]; icon: string }, courseIdx: number) => (
                    <div key={courseIdx} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                      <div className="flex gap-2 items-center mb-2">
                        <input
                          type="text"
                          value={course.name}
                          onChange={(e) => updateMenuCourse(courseIdx, "name", e.target.value)}
                          className={`${inputClass} flex-1`}
                          placeholder="Nom du plat (ex: Entrée)"
                        />
                        <button onClick={() => removeMenuCourse(courseIdx)} className={btnDanger}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="space-y-1.5 pl-2">
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
                        <button onClick={() => addMenuItem(courseIdx)} className="text-[11px] text-[#7A3A50] dark:text-[#C48B90] hover:underline">
                          + Ajouter un élément
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={addMenuCourse} className={btnSecondary}>
                    <Plus className="h-3.5 w-3.5" /> Ajouter un plat
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════════ STEP 3 — INFOS & MOMENTS ═══════════════ */}
        {currentStep === 2 && (
          <>
            {/* Logistics */}
            <div className={cardClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">🚗 Infos pratiques</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500">{getModule("MOD_LOGISTIQUE")?.active ? "Actif" : "Inactif"}</span>
                  <button
                    onClick={() => toggleModule("MOD_LOGISTIQUE")}
                    className={`relative h-5 w-9 rounded-full transition ${getModule("MOD_LOGISTIQUE")?.active ? "bg-[#7A3A50]" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: getModule("MOD_LOGISTIQUE")?.active ? "18px" : "2px" }} />
                  </button>
                </label>
              </div>

              {getModule("MOD_LOGISTIQUE")?.active && (
                <div className="space-y-3">
                  {logSections.map((section: { title: string; description: string; icon: string }, idx: number) => (
                    <div key={idx} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                      <div className="flex gap-2 items-center mb-2">
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateLogSection(idx, "title", e.target.value)}
                          className={`${inputClass} flex-1`}
                          placeholder="Titre (ex: Transport)"
                        />
                        <button onClick={() => removeLogSection(idx)} className={btnDanger}>
                          <Trash2 className="h-3.5 w-3.5" />
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
                  <button onClick={addLogSection} className={btnSecondary}>
                    <Plus className="h-3.5 w-3.5" /> Ajouter une section
                  </button>
                </div>
              )}
            </div>

            {/* Gallery */}
            <div className={cardClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">📷 Galerie</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500">{getModule("MOD_GALERIE")?.active ? "Actif" : "Inactif"}</span>
                  <button
                    onClick={() => toggleModule("MOD_GALERIE")}
                    className={`relative h-5 w-9 rounded-full transition ${getModule("MOD_GALERIE")?.active ? "bg-[#7A3A50]" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: getModule("MOD_GALERIE")?.active ? "18px" : "2px" }} />
                  </button>
                </label>
              </div>

              {getModule("MOD_GALERIE")?.active && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Ajoutez des URLs d&apos;images pour votre galerie.
                  </p>
                  <div className="space-y-2">
                    {((getConfig("MOD_GALERIE")?.photos || []) as { url: string; caption: string }[]).map((photo: { url: string; caption: string }, idx: number) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="url"
                          value={photo.url || ""}
                          onChange={(e) => {
                            const photos = [...(getConfig("MOD_GALERIE")?.photos || [])];
                            photos[idx] = { ...photos[idx], url: e.target.value };
                            updateModuleConfig("MOD_GALERIE", { photos });
                          }}
                          className={`${inputClass} flex-1`}
                          placeholder="URL de l'image"
                        />
                        <input
                          type="text"
                          value={photo.caption || ""}
                          onChange={(e) => {
                            const photos = [...(getConfig("MOD_GALERIE")?.photos || [])];
                            photos[idx] = { ...photos[idx], caption: e.target.value };
                            updateModuleConfig("MOD_GALERIE", { photos });
                          }}
                          className={`${inputClass} w-32`}
                          placeholder="Légende"
                        />
                        <button
                          onClick={() => {
                            const photos = [...(getConfig("MOD_GALERIE")?.photos || [])];
                            photos.splice(idx, 1);
                            updateModuleConfig("MOD_GALERIE", { photos });
                          }}
                          className={btnDanger}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const photos = [...(getConfig("MOD_GALERIE")?.photos || []), { url: "", caption: "" }];
                      updateModuleConfig("MOD_GALERIE", { photos });
                    }}
                    className={`${btnSecondary} mt-2`}
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter une photo
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════════ STEP 4 — CONFIRMATION ═══════════════ */}
        {currentStep === 3 && (
          <>
            {/* RSVP toggle */}
            <div className={cardClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">✅ Confirmation de présence (RSVP)</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500">{getModule("MOD_RSVP")?.active ? "Actif" : "Inactif"}</span>
                  <button
                    onClick={() => toggleModule("MOD_RSVP")}
                    className={`relative h-5 w-9 rounded-full transition ${getModule("MOD_RSVP")?.active ? "bg-[#7A3A50]" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: getModule("MOD_RSVP")?.active ? "18px" : "2px" }} />
                  </button>
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Active le formulaire de confirmation de présence sur la carte d&apos;invitation.
                Les invités pourront confirmer, choisir leur menu et recevoir leur QR code.
              </p>
            </div>

            {/* Chat toggle */}
            <div className={cardClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">💬 Chat en direct</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500">{getModule("MOD_CHAT")?.active ? "Actif" : "Inactif"}</span>
                  <button
                    onClick={() => toggleModule("MOD_CHAT")}
                    className={`relative h-5 w-9 rounded-full transition ${getModule("MOD_CHAT")?.active ? "bg-[#7A3A50]" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: getModule("MOD_CHAT")?.active ? "18px" : "2px" }} />
                  </button>
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Active le chat en direct sur la carte d&apos;invitation.
                Les invités peuvent envoyer des messages visibles par tous.
              </p>
            </div>

            {/* Quick links */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href={`/events/${event.id}/theme`}
                className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm transition hover:border-[#7A3A50]/20 hover:shadow-md"
              >
                <span className="text-2xl">🎨</span>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Personnaliser le thème</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Couleurs, polices, effets</p>
                </div>
              </Link>
              <Link
                href={`/events/${event.id}/guests`}
                className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm transition hover:border-[#7A3A50]/20 hover:shadow-md"
              >
                <span className="text-2xl">👥</span>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Gérer les invités</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ajouter, inviter, suivre</p>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
