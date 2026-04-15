"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EVENT_TYPES } from "@/lib/config";
import { Plus, Trash2, MapPin, Clock, Calendar } from "lucide-react";

type Step = "welcome" | "event-type" | "event-details" | "complete";

interface Venue {
  name: string;
  address: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface OnboardingData {
  eventType: string;
  title: string;
  dates: string[]; // multi-day: array of date strings "YYYY-MM-DD"
  venues: Venue[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [data, setData] = useState<OnboardingData>({
    eventType: "",
    title: "",
    dates: [""],
    venues: [{ name: "", address: "", date: "", startTime: "", endTime: "" }],
  });
  const [isLoading, setIsLoading] = useState(false);

  // ─── Date helpers ────────────────────────────────
  function addDate() {
    setData((prev) => ({ ...prev, dates: [...prev.dates, ""] }));
  }

  function removeDate(index: number) {
    setData((prev) => ({
      ...prev,
      dates: prev.dates.filter((_, i) => i !== index),
    }));
  }

  function updateDate(index: number, value: string) {
    setData((prev) => {
      const dates = [...prev.dates];
      dates[index] = value;
      return { ...prev, dates };
    });
  }

  // ─── Venue helpers ───────────────────────────────
  function addVenue() {
    setData((prev) => ({
      ...prev,
      venues: [
        ...prev.venues,
        {
          name: "",
          address: "",
          date: prev.dates[0] || "",
          startTime: "",
          endTime: "",
        },
      ],
    }));
  }

  function removeVenue(index: number) {
    setData((prev) => ({
      ...prev,
      venues: prev.venues.filter((_, i) => i !== index),
    }));
  }

  function updateVenue(index: number, field: keyof Venue, value: string) {
    setData((prev) => {
      const venues = [...prev.venues];
      venues[index] = { ...venues[index], [field]: value };
      return { ...prev, venues };
    });
  }

  // ─── Submit ──────────────────────────────────────
  async function handleComplete() {
    setIsLoading(true);
    try {
      const payload = {
        eventType: data.eventType,
        title: data.title,
        dates: data.dates.filter(Boolean),
        venues: data.venues
          .filter((v) => v.name && v.address)
          .map((v) => ({
            ...v,
            date: v.date || data.dates[0] || "",
          })),
      };

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        router.push(`/events/${result.data?.id || ""}`);
      } else {
        router.push("/dashboard");
      }
    } catch {
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSkip() {
    router.push("/dashboard");
  }

  // Get valid dates for venue selector
  const validDates = data.dates.filter(Boolean);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FFFDF9] via-white to-[#FFF0F3] px-4 py-8">
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {["welcome", "event-type", "event-details", "complete"].map((s, i) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                i <= ["welcome", "event-type", "event-details", "complete"].indexOf(step)
                  ? "w-12 bg-[#7A3A50]"
                  : "w-8 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Step: Welcome */}
        {step === "welcome" && (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-xl shadow-gray-100/50">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7A3A50] to-[#C48B90]">
              <span className="text-3xl">🎉</span>
            </div>
            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              Bienvenue sur EventFlow !
            </h1>
            <p className="mt-3 text-gray-500">
              Créons ensemble votre première invitation.
              <br />
              Cela ne prend que 2 minutes.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => setStep("event-type")}
                className="w-full rounded-lg bg-[#7A3A50] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#7A3A50]/25 transition hover:bg-[#6A2A40]"
              >
                Créer mon premier événement
              </button>
              <button
                onClick={handleSkip}
                className="text-sm text-gray-400 transition hover:text-gray-600"
              >
                Passer pour l&apos;instant →
              </button>
            </div>
          </div>
        )}

        {/* Step: Event Type */}
        {step === "event-type" && (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-100/50">
            <h2 className="text-xl font-bold text-gray-900">
              Quel type d&apos;événement organisez-vous ?
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Le thème et les modules seront ajustés automatiquement.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {(Object.entries(EVENT_TYPES) as [string, { label: string; icon: string; description: string; color: string }][]).map(
                ([key, val]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setData((prev) => ({ ...prev, eventType: key }));
                      setStep("event-details");
                    }}
                    className={`group flex flex-col items-start rounded-xl border p-4 text-left transition hover:border-[#7A3A50]/40 hover:shadow-md ${
                      data.eventType === key
                        ? "border-[#7A3A50] bg-[#7A3A50]/5 shadow-md"
                        : "border-gray-100"
                    }`}
                  >
                    <span className="text-2xl">{val.icon}</span>
                    <span className="mt-2 font-semibold text-gray-900">
                      {val.label}
                    </span>
                    <span className="mt-0.5 text-xs text-gray-500">
                      {val.description}
                    </span>
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => setStep("welcome")}
              className="mt-4 text-sm text-gray-400 transition hover:text-gray-600"
            >
              ← Retour
            </button>
          </div>
        )}

        {/* Step: Event Details — Multi-day + Multi-venue */}
        {step === "event-details" && (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-100/50">
            <h2 className="text-xl font-bold text-gray-900">
              Les détails de votre événement
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Vous pourrez les modifier plus tard.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep("complete");
              }}
              className="mt-6 space-y-6"
            >
              {/* Title */}
              <div>
                <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Titre de l&apos;événement
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={data.title}
                  onChange={(e) => setData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
                  placeholder={
                    data.eventType === "MARIAGE"
                      ? "Mariage de Marie & Jean"
                      : data.eventType === "ANNIVERSAIRE"
                      ? "Anniversaire de Sophie — 30 ans"
                      : "Mon événement"
                  }
                />
              </div>

              {/* ─── Dates (multi-day) ─────────────────────── */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Calendar className="h-4 w-4 text-[#7A3A50]" />
                    Dates de l&apos;événement
                  </label>
                  <button
                    type="button"
                    onClick={addDate}
                    className="flex items-center gap-1 rounded-md bg-[#7A3A50]/10 px-2.5 py-1 text-xs font-medium text-[#7A3A50] transition hover:bg-[#7A3A50]/20"
                  >
                    <Plus className="h-3 w-3" />
                    Ajouter un jour
                  </button>
                </div>
                <div className="space-y-2">
                  {data.dates.map((date, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7A3A50]/10 text-xs font-bold text-[#7A3A50]">
                        J{i + 1}
                      </div>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => updateDate(i, e.target.value)}
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
                        aria-label={`Date du jour ${i + 1}`}
                      />
                      {data.dates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDate(i)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                          aria-label={`Supprimer le jour ${i + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {data.dates.length > 1 && (
                  <p className="mt-1.5 text-xs text-gray-400">
                    {data.dates.filter(Boolean).length} jour{data.dates.filter(Boolean).length > 1 ? "s" : ""} sélectionné{data.dates.filter(Boolean).length > 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* ─── Venues (multi-location) ──────────────── */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <MapPin className="h-4 w-4 text-[#7A3A50]" />
                    Lieux & Programme
                  </label>
                  <button
                    type="button"
                    onClick={addVenue}
                    className="flex items-center gap-1 rounded-md bg-[#7A3A50]/10 px-2.5 py-1 text-xs font-medium text-[#7A3A50] transition hover:bg-[#7A3A50]/20"
                  >
                    <Plus className="h-3 w-3" />
                    Ajouter un lieu
                  </button>
                </div>
                <div className="space-y-4">
                  {data.venues.map((venue, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition hover:border-gray-200"
                    >
                      {data.venues.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVenue(i)}
                          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                          aria-label={`Supprimer le lieu ${i + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#7A3A50] uppercase tracking-wide">
                        <MapPin className="h-3 w-3" />
                        Lieu {i + 1}
                      </div>

                      {/* Venue Name */}
                      <input
                        type="text"
                        value={venue.name}
                        onChange={(e) => updateVenue(i, "name", e.target.value)}
                        className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
                        placeholder="Nom du lieu (ex: Château de Versailles)"
                      />

                      {/* Venue Address */}
                      <input
                        type="text"
                        value={venue.address}
                        onChange={(e) => updateVenue(i, "address", e.target.value)}
                        className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
                        placeholder="Adresse complète"
                      />

                      {/* Date + Time row */}
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Day selector */}
                        <div>
                          <label className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" /> Jour
                          </label>
                          {validDates.length > 1 ? (
                            <select
                              value={venue.date}
                              onChange={(e) => updateVenue(i, "date", e.target.value)}
                              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900 outline-none transition focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
                              aria-label={`Jour pour le lieu ${i + 1}`}
                            >
                              <option value="">Choisir</option>
                              {validDates.map((d, j) => (
                                <option key={j} value={d}>
                                  J{j + 1} — {new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              readOnly
                              value={validDates[0] ? new Date(validDates[0] + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"}
                              className="w-full rounded-lg border border-gray-200 bg-gray-100 px-2 py-2 text-sm text-gray-500"
                              aria-label="Jour de l'événement"
                            />
                          )}
                        </div>

                        {/* Start time */}
                        <div>
                          <label className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" /> Début
                          </label>
                          <input
                            type="time"
                            value={venue.startTime}
                            onChange={(e) => updateVenue(i, "startTime", e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900 outline-none transition focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
                            aria-label={`Heure de début du lieu ${i + 1}`}
                          />
                        </div>

                        {/* End time */}
                        <div>
                          <label className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" /> Fin
                          </label>
                          <input
                            type="time"
                            value={venue.endTime}
                            onChange={(e) => updateVenue(i, "endTime", e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900 outline-none transition focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
                            aria-label={`Heure de fin du lieu ${i + 1}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("event-type")}
                  className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  ← Retour
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-[#7A3A50] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7A3A50]/25 transition hover:bg-[#6A2A40]"
                >
                  Continuer
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-xl shadow-gray-100/50">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
              <span className="text-3xl">✨</span>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Tout est prêt !
            </h2>
            <p className="mt-3 text-gray-500">
              Votre événement <strong>&quot;{data.title}&quot;</strong> va être créé.
            </p>

            {/* Summary */}
            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-left text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4 text-[#7A3A50]" />
                <span className="font-medium">
                  {data.dates.filter(Boolean).length} jour{data.dates.filter(Boolean).length > 1 ? "s" : ""}
                </span>
                <span className="text-gray-400">—</span>
                <span>
                  {data.dates
                    .filter(Boolean)
                    .map((d) => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }))
                    .join(", ")}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4 text-[#7A3A50]" />
                <span className="font-medium">
                  {data.venues.filter((v) => v.name).length} lieu{data.venues.filter((v) => v.name).length > 1 ? "x" : ""}
                </span>
              </div>
              {data.venues.filter((v) => v.name).map((v, i) => (
                <div key={i} className="mt-1 ml-6 text-xs text-gray-500">
                  • {v.name} {v.startTime && `(${v.startTime}${v.endTime ? ` — ${v.endTime}` : ""})`}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={handleComplete}
                disabled={isLoading}
                className="w-full rounded-lg bg-[#7A3A50] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#7A3A50]/25 transition hover:bg-[#6A2A40] disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Création en cours...
                  </span>
                ) : (
                  "Créer mon événement 🎉"
                )}
              </button>
              <button
                onClick={() => setStep("event-details")}
                className="text-sm text-gray-400 transition hover:text-gray-600"
              >
                ← Modifier les détails
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
