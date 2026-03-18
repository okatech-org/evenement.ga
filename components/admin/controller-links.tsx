"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Copy,
  Check,
  Loader2,
  Shield,
  ShieldCheck,
  ExternalLink,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  X,
  ScanLine,
} from "lucide-react";

interface ControllerLinkData {
  id: string;
  token: string;
  label: string;
  permission: "VERIFY" | "SCAN";
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  scanCount: number;
  url: string;
}

export function ControllerLinks({ eventId }: { eventId: string }) {
  const [links, setLinks] = useState<ControllerLinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newLink, setNewLink] = useState({
    label: "",
    permission: "VERIFY" as "VERIFY" | "SCAN",
    expiresAt: "",
  });

  const loadLinks = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/controllers`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setLinks(data.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newLink.label.trim()) return;
    setCreating(true);

    try {
      const res = await fetch(`/api/events/${eventId}/controllers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLink.label.trim(),
          permission: newLink.permission,
          expiresAt: newLink.expiresAt || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLinks((prev) => [data.data, ...prev]);
          setNewLink({ label: "", permission: "VERIFY", expiresAt: "" });
          setShowForm(false);
        }
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  }

  function handleCopy(link: ControllerLinkData) {
    navigator.clipboard.writeText(link.url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleToggle(linkId: string) {
    setTogglingId(linkId);
    try {
      const res = await fetch(`/api/events/${eventId}/controllers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, action: "toggle" }),
      });

      if (res.ok) {
        const data = await res.json();
        setLinks((prev) =>
          prev.map((l) =>
            l.id === linkId ? { ...l, isActive: data.data.isActive } : l
          )
        );
      }
    } catch {
      // silent
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(linkId: string) {
    if (!confirm("Supprimer ce lien contrôleur ? Cette action est irréversible.")) return;
    setDeletingId(linkId);
    try {
      const res = await fetch(`/api/events/${eventId}/controllers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      });

      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l.id !== linkId));
      }
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#7A3A50] dark:text-[#C48B90]" />
            Liens Contrôleur
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Partagez ces liens avec vos agents de sécurité ou hôtesses pour vérifier les invitations
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#7A3A50] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6A2A40] transition"
        >
          {showForm ? (
            <>
              <X className="h-3.5 w-3.5" />
              Annuler
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Nouveau lien
            </>
          )}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-[#7A3A50]/20 dark:border-[#7A3A50]/30 bg-[#7A3A50]/5 dark:bg-[#7A3A50]/10 p-5 space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Libellé *
              </label>
              <input
                type="text"
                placeholder="Ex: Sécurité entrée principale"
                required
                value={newLink.label}
                onChange={(e) => setNewLink((p) => ({ ...p, label: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Permission
              </label>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewLink((p) => ({ ...p, permission: "VERIFY" }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition border ${
                    newLink.permission === "VERIFY"
                      ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Vérifier
                </button>
                <button
                  type="button"
                  onClick={() => setNewLink((p) => ({ ...p, permission: "SCAN" }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition border ${
                    newLink.permission === "SCAN"
                      ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Scanner
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Expiration (optionnel)
            </label>
            <input
              type="datetime-local"
              value={newLink.expiresAt}
              onChange={(e) => setNewLink((p) => ({ ...p, expiresAt: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
            />
          </div>

          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            <strong>Vérifier :</strong> Le contrôleur peut vérifier le statut d&apos;un invité (lecture seule).{" "}
            <strong>Scanner :</strong> Le contrôleur peut vérifier ET enregistrer l&apos;entrée de l&apos;invité.
          </p>

          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#7A3A50] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6A2A40] disabled:opacity-50 transition"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {creating ? "Création..." : "Créer le lien"}
          </button>
        </form>
      )}

      {/* Links List */}
      {links.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 mb-3">
            <Shield className="h-6 w-6 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Aucun lien contrôleur
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Créez un lien pour permettre à vos agents de vérifier les invitations
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => {
            const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
            const isDisabled = !link.isActive || isExpired;

            return (
              <div
                key={link.id}
                className={`rounded-xl border bg-white dark:bg-gray-900 p-4 shadow-sm transition ${
                  isDisabled
                    ? "border-gray-200 dark:border-gray-800 opacity-60"
                    : "border-gray-100 dark:border-gray-800 hover:border-[#7A3A50]/20 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                    link.permission === "SCAN"
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-blue-100 dark:bg-blue-900/30"
                  }`}>
                    {link.permission === "SCAN" ? (
                      <ShieldCheck className="h-4.5 w-4.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Shield className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {link.label}
                      </p>
                      {isExpired && (
                        <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                          Expiré
                        </span>
                      )}
                      {!link.isActive && !isExpired && (
                        <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                          Désactivé
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate">
                      {link.url}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <ScanLine className="h-3 w-3" />
                        {link.scanCount} scan{link.scanCount !== 1 ? "s" : ""}
                      </span>
                      <span className={`font-medium ${
                        link.permission === "SCAN" ? "text-green-500" : "text-blue-500"
                      }`}>
                        {link.permission === "SCAN" ? "Scan + enregistrement" : "Vérification seule"}
                      </span>
                      {link.lastUsedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Utilisé {new Date(link.lastUsedAt).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                      title="Ouvrir le lien"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      onClick={() => handleCopy(link)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                      title="Copier le lien"
                    >
                      {copiedId === link.id ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleToggle(link.id)}
                      disabled={togglingId === link.id}
                      className={`rounded-lg p-2 transition ${
                        link.isActive
                          ? "text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30"
                          : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                      title={link.isActive ? "Désactiver" : "Réactiver"}
                    >
                      {togglingId === link.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : link.isActive ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      disabled={deletingId === link.id}
                      className="rounded-lg p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-50"
                      title="Supprimer"
                    >
                      {deletingId === link.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
