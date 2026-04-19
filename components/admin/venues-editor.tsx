"use client";

import { Plus, Trash2, MapPin, Clock, Calendar } from "lucide-react";
import type { VenueDraft } from "./venue-utils";

// Re-export pour que les imports existants continuent à fonctionner.
export type { VenueDraft } from "./venue-utils";
export { venueFromConvex } from "./venue-utils";

interface VenuesEditorProps {
  venues: VenueDraft[];
  /** Dates disponibles (strings YYYY-MM-DD). Si 1 seule → champ readonly, sinon selecteur. */
  availableDates: string[];
  onChange: (venues: VenueDraft[]) => void;
  /** Palette pour le theming (primary color pour accents) */
  accentColor?: string;
  /** Texte du bouton d'ajout (default: "Ajouter un lieu") */
  addLabel?: string;
}

/**
 * Éditeur réutilisable de venues (lieux) — utilisé par :
 *  - L'onboarding (step-3)
 *  - L'edit page (onglet Lieux)
 *
 * Gère uniquement l'état local ; la persistence est au parent.
 */
export function VenuesEditor({
  venues,
  availableDates,
  onChange,
  accentColor = "#88734C",
  addLabel = "Ajouter un lieu",
}: VenuesEditorProps) {
  const validDates = availableDates.filter(Boolean);

  function addVenue() {
    onChange([
      ...venues,
      {
        name: "",
        address: "",
        date: validDates[0] || "",
        startTime: "",
        endTime: "",
      },
    ]);
  }

  function removeVenue(index: number) {
    onChange(venues.filter((_, i) => i !== index));
  }

  function updateVenue(index: number, field: keyof VenueDraft, value: string) {
    const next = [...venues];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  }

  const accentBg = `${accentColor}1A`; // ~10% opacity
  const accentRing = `${accentColor}33`; // ~20% opacity

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <MapPin className="h-4 w-4" style={{ color: accentColor }} />
          Lieux &amp; Programme
        </label>
        <button
          type="button"
          onClick={addVenue}
          className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition hover:opacity-80"
          style={{ backgroundColor: accentBg, color: accentColor }}
        >
          <Plus className="h-3 w-3" />
          {addLabel}
        </button>
      </div>

      {venues.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
          Aucun lieu pour l&apos;instant. Ajoutez-en un.
        </p>
      )}

      <div className="space-y-4">
        {venues.map((venue, i) => (
          <div
            key={i}
            className="relative rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition hover:border-gray-200"
          >
            {venues.length > 1 && (
              <button
                type="button"
                onClick={() => removeVenue(i)}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                aria-label={`Supprimer le lieu ${i + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}

            <div
              className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
              style={{ color: accentColor }}
            >
              <MapPin className="h-3 w-3" />
              Lieu {i + 1}
            </div>

            <input
              type="text"
              value={venue.name}
              onChange={(e) => updateVenue(i, "name", e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:ring-2"
              style={{ borderColor: venue.name ? accentColor : undefined }}
              onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${accentRing}`)}
              onBlur={(e) => (e.currentTarget.style.boxShadow = "")}
              placeholder="Nom du lieu (ex: Château de Versailles)"
              aria-label={`Nom du lieu ${i + 1}`}
            />

            <input
              type="text"
              value={venue.address}
              onChange={(e) => updateVenue(i, "address", e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:ring-2"
              onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${accentRing}`)}
              onBlur={(e) => (e.currentTarget.style.boxShadow = "")}
              placeholder="Adresse complète"
              aria-label={`Adresse du lieu ${i + 1}`}
            />

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" /> Jour
                </label>
                {validDates.length > 1 ? (
                  <select
                    value={venue.date}
                    onChange={(e) => updateVenue(i, "date", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900 outline-none transition"
                    aria-label={`Jour pour le lieu ${i + 1}`}
                  >
                    <option value="">Choisir</option>
                    {validDates.map((d, j) => (
                      <option key={j} value={d}>
                        J{j + 1} —{" "}
                        {new Date(d + "T00:00:00").toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    readOnly
                    value={
                      validDates[0]
                        ? new Date(validDates[0] + "T00:00:00").toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })
                        : "—"
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-2 py-2 text-sm text-gray-500"
                    aria-label="Jour de l'événement"
                  />
                )}
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" /> Début
                </label>
                <input
                  type="time"
                  value={venue.startTime}
                  onChange={(e) => updateVenue(i, "startTime", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900 outline-none transition"
                  aria-label={`Heure de début du lieu ${i + 1}`}
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" /> Fin
                </label>
                <input
                  type="time"
                  value={venue.endTime}
                  onChange={(e) => updateVenue(i, "endTime", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900 outline-none transition"
                  aria-label={`Heure de fin du lieu ${i + 1}`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
