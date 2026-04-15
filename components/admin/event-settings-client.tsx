"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Globe,
  Link2,
  Lock,
  KeyRound,
  Copy,
  Trash2,
  Archive,
  Loader2,
  Check,
  Save,
  AlertTriangle,
} from "lucide-react";
import { ControllerLinks } from "./controller-links";

interface SettingsClientProps {
  event: {
    id: string;
    title: string;
    slug: string;
    type: string;
    visibility: string;
    password: string | null;
  };
}

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public", desc: "Visible par tous", icon: Globe },
  { value: "SEMI_PRIVATE", label: "Semi-privé", desc: "Lien uniquement", icon: Link2 },
  { value: "PRIVATE", label: "Privé", desc: "Invités uniquement", icon: Lock },
  { value: "PASSWORD", label: "Mot de passe", desc: "Protégé par mot de passe", icon: KeyRound },
];

export function EventSettingsClient({ event }: SettingsClientProps) {
  const router = useRouter();
  const [visibility, setVisibility] = useState(event.visibility);
  const [password, setPassword] = useState(event.password || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSaveVisibility() {
    setIsSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibility,
          password: visibility === "PASSWORD" ? password : null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDuplicate() {
    setIsDuplicating(true);
    try {
      const res = await fetch(`/api/events/${event.id}/duplicate`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/events/${data.data.id}`);
      }
    } catch (error) {
      console.error("Duplicate error:", error);
    } finally {
      setIsDuplicating(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/events");
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col h-full gap-3 lg:gap-4 overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 shrink-0">
        <Link href="/events" className="hover:text-[#7A3A50] dark:hover:text-[#C48B90]">
          Événements
        </Link>
        <span>/</span>
        <Link href={`/events/${event.id}`} className="hover:text-[#7A3A50] dark:hover:text-[#C48B90]">
          {event.title}
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300">Paramètres</span>
      </div>

      <h1 className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-white shrink-0">⚙️ Paramètres</h1>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">

      {/* Event Info */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 lg:p-6 shadow-sm space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Informations</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Titre
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-300">{event.title}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Type
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-300">{event.type}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              URL publique
            </label>
            <div className="flex items-center gap-2">
              <code className="rounded-lg bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300">
                /{event.slug}
              </code>
              <Link
                href={`/${event.slug}`}
                target="_blank"
                className="text-xs text-[#7A3A50] dark:text-[#C48B90] hover:underline"
              >
                Ouvrir →
              </Link>
            </div>
          </div>
          <div>
            <Link
              href={`/events/${event.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#7A3A50]/20 px-3 py-1.5 text-xs font-medium text-[#7A3A50] dark:text-[#C48B90] transition hover:bg-[#7A3A50]/5"
            >
              ✏️ Modifier les détails
            </Link>
          </div>
        </div>
      </div>

      {/* Visibility */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 lg:p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Visibilité</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Contrôler qui peut voir votre événement
            </p>
          </div>
          <button
            onClick={handleSaveVisibility}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#7A3A50] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#6A2A40] disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : saved ? (
              <Check className="h-3 w-3" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            {isSaving ? "Sauvegarde..." : saved ? "Sauvegardé ✓" : "Sauvegarder"}
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {VISIBILITY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setVisibility(opt.value)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                  visibility === opt.value
                    ? "border-[#7A3A50] bg-[#7A3A50]/5 dark:bg-[#7A3A50]/20"
                    : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                }`}
              >
                <Icon className={`h-5 w-5 ${
                  visibility === opt.value ? "text-[#7A3A50] dark:text-[#C48B90]" : "text-gray-400"
                }`} />
                <div>
                  <p className={`text-sm font-semibold ${
                    visibility === opt.value ? "text-[#7A3A50] dark:text-[#C48B90]" : "text-gray-900 dark:text-white"
                  }`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {visibility === "PASSWORD" && (
          <div className="mt-3">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Mot de passe d&apos;accès
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 outline-none transition focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
              placeholder="Entrez un mot de passe"
            />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 lg:p-6 shadow-sm space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Actions rapides</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDuplicate}
            disabled={isDuplicating}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {isDuplicating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {isDuplicating ? "Duplication..." : "Dupliquer l'événement"}
          </button>
        </div>
      </div>

      {/* Controller Links */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 lg:p-6 shadow-sm">
        <ControllerLinks eventId={event.id} />
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-4 lg:p-6 space-y-3">
        <h2 className="font-semibold text-red-800 dark:text-red-400">Zone de danger</h2>

        {/* Archive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-400">
              Archiver l&apos;événement
            </p>
            <p className="text-xs text-red-600 dark:text-red-500">
              L&apos;invitation sera désactivée
            </p>
          </div>
          <form action={`/api/events/${event.id}/status`} method="POST">
            <input type="hidden" name="status" value="ARCHIVED" />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Archive className="h-4 w-4" />
              Archiver
            </button>
          </form>
        </div>

        {/* Delete */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-red-200 dark:border-red-900/50 pt-4">
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-400">
              Supprimer l&apos;événement
            </p>
            <p className="text-xs text-red-600 dark:text-red-500">
              Cette action est irréversible
            </p>
          </div>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {isDeleting ? "Suppression..." : "Confirmer la suppression"}
              </button>
            </div>
          )}
        </div>
      </div>

      </div>
    </div>
  );
}
