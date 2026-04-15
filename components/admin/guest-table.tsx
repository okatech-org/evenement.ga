"use client";

import { useState } from "react";
import {
  UserPlus,
  Check,
  Trash2,
  Mail,
  Loader2,
  Link2,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// WhatsApp SVG icon component
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface GuestData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  statusLabel: string;
  statusColor: string;
  inviteToken: string | null;
  presence: boolean | null;
  adultCount: number;
  childrenCount: number;
  menuChoice: string | null;
  allergies: string[];
  message: string | null;
}

interface GuestTableProps {
  eventId: string;
  eventSlug: string;
  guests: GuestData[];
}

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm font-medium text-white shadow-xl backdrop-blur-sm animate-slide-up ${
      type === "success"
        ? "bg-gradient-to-r from-green-500 to-emerald-600"
        : "bg-gradient-to-r from-red-500 to-rose-600"
    }`}>
      <span>{type === "success" ? "✅" : "❌"}</span>
      <span>{message}</span>
      <button onClick={onClose} title="Fermer" className="ml-2 rounded-full p-0.5 hover:bg-white/20 transition">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function GuestTable({ eventId, eventSlug, guests: initialGuests }: GuestTableProps) {
  const [guests, setGuests] = useState(initialGuests);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [emailSentId, setEmailSentId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [page, setPage] = useState(0);
  const CARDS_PER_PAGE = 12; // 4 colonnes × 3 lignes
  // WhatsApp phone modal state
  const [whatsappModal, setWhatsappModal] = useState<{ guest: GuestData; phone: string } | null>(null);
  const [newGuest, setNewGuest] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    group: "",
  });

  const filtered = guests.filter((g) => {
    if (filter !== "all" && g.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        g.firstName.toLowerCase().includes(s) ||
        g.lastName.toLowerCase().includes(s) ||
        g.email.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Reset page quand filtre ou recherche change
  const filteredKey = `${filter}-${search}`;
  const [prevFilteredKey, setPrevFilteredKey] = useState(filteredKey);
  if (filteredKey !== prevFilteredKey) {
    setPrevFilteredKey(filteredKey);
    setPage(0);
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  function getInviteUrl(token: string | null): string {
    if (!token) return "";
    return `${baseUrl}/${eventSlug}?guest=${token}`;
  }

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!newGuest.firstName || !newGuest.lastName) return;
    setIsAdding(true);

    try {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGuest),
      });

      if (res.ok) {
        const data = await res.json();
        const g = data.data;
        setGuests((prev) => [
          {
            id: g.id,
            firstName: g.firstName,
            lastName: g.lastName,
            email: g.email || "",
            phone: g.phone,
            status: g.status,
            statusLabel: "⏳ En attente",
            statusColor: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
            inviteToken: g.inviteToken,
            presence: null,
            adultCount: 0,
            childrenCount: 0,
            menuChoice: null,
            allergies: [],
            message: null,
          },
          ...prev,
        ]);
        setNewGuest({ firstName: "", lastName: "", email: "", phone: "", group: "" });
        setShowAddForm(false);
        showToast(`${g.firstName} ${g.lastName} ajouté(e) avec succès`, "success");
      }
    } catch (error) {
      console.error("Add guest error:", error);
      showToast("Erreur lors de l'ajout de l'invité", "error");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDelete(guestId: string) {
    setDeletingId(guestId);
    try {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId }),
      });

      if (res.ok) {
        setGuests((prev) => prev.filter((g) => g.id !== guestId));
        showToast("Invité supprimé", "success");
      }
    } catch (error) {
      console.error("Delete guest error:", error);
      showToast("Erreur lors de la suppression", "error");
    } finally {
      setDeletingId(null);
    }
  }

  function handleCopyLink(guestId: string, token: string | null) {
    if (!token) return;
    const url = getInviteUrl(token);
    navigator.clipboard.writeText(url);
    setCopiedId(guestId);
    setTimeout(() => setCopiedId(null), 2000);
    showToast("Lien copié dans le presse-papier", "success");
  }

  // WhatsApp — handles both with and without phone
  function handleShareWhatsApp(guest: GuestData) {
    if (!guest.inviteToken) {
      showToast("Générez d'abord un lien d'invitation", "error");
      return;
    }

    if (guest.phone) {
      // Has phone, open WhatsApp directly
      openWhatsApp(guest, guest.phone);
    } else {
      // No phone — show modal to enter phone number
      setWhatsappModal({ guest, phone: "" });
    }
  }

  function openWhatsApp(guest: GuestData, phone: string) {
    const url = getInviteUrl(guest.inviteToken);
    const text = encodeURIComponent(
      `Bonjour ${guest.firstName} ! 🎉\nVous êtes invité(e) ! Voici votre invitation personnalisée :\n${url}`
    );
    const cleanPhone = phone.replace(/[\s\-()]/g, "");
    const whatsappUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(whatsappUrl, "_blank");
  }

  function handleWhatsappModalSubmit() {
    if (!whatsappModal) return;
    const { guest, phone } = whatsappModal;

    if (phone.trim()) {
      // Update the guest's phone locally
      setGuests((prev) =>
        prev.map((g) =>
          g.id === guest.id ? { ...g, phone: phone.trim() } : g
        )
      );
      openWhatsApp(guest, phone.trim());
    } else {
      // Open without phone (share link only)
      openWhatsApp(guest, "");
    }
    setWhatsappModal(null);
  }

  // Email — real sending via Resend API
  async function handleSendEmail(guest: GuestData) {
    if (!guest.email) {
      showToast("Cet invité n'a pas d'adresse email", "error");
      return;
    }
    if (!guest.inviteToken) {
      showToast("Générez d'abord un lien d'invitation", "error");
      return;
    }

    setSendingEmailId(guest.id);

    try {
      const res = await fetch(`/api/events/${eventId}/guests/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: guest.id }),
      });

      const data = await res.json();

      if (res.ok) {
        setEmailSentId(guest.id);
        setTimeout(() => setEmailSentId(null), 3000);
        showToast(`Email envoyé à ${guest.email}`, "success");
      } else {
        showToast(data.error || "Erreur lors de l'envoi", "error");
      }
    } catch (error) {
      console.error("Send email error:", error);
      showToast("Erreur réseau lors de l'envoi de l'email", "error");
    } finally {
      setSendingEmailId(null);
    }
  }

  async function handleGenerateToken(guestId: string) {
    setGeneratingId(guestId);
    try {
      const res = await fetch(`/api/events/${eventId}/guests/generate-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId }),
      });

      if (res.ok) {
        const data = await res.json();
        setGuests((prev) =>
          prev.map((g) =>
            g.id === guestId ? { ...g, inviteToken: data.data.inviteToken } : g
          )
        );
        showToast("Lien d'invitation généré", "success");
      }
    } catch (error) {
      console.error("Generate token error:", error);
      showToast("Erreur lors de la génération du lien", "error");
    } finally {
      setGeneratingId(null);
    }
  }

  async function exportCSV() {
    const headers = ["Prénom", "Nom", "Email", "Téléphone", "Statut", "Lien", "Adultes", "Enfants", "Menu", "Allergies", "Message"];
    const rows = filtered.map((g) => [
      g.firstName,
      g.lastName,
      g.email,
      g.phone || "",
      g.statusLabel,
      g.inviteToken ? getInviteUrl(g.inviteToken) : "",
      String(g.adultCount),
      String(g.childrenCount),
      g.menuChoice || "",
      g.allergies.join(", "),
      g.message || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invites-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* WhatsApp Phone Modal */}
      {whatsappModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <WhatsAppIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Envoyer via WhatsApp
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {whatsappModal.guest.firstName} {whatsappModal.guest.lastName}
                </p>
              </div>
              <button
                onClick={() => setWhatsappModal(null)}
                title="Fermer"
                className="ml-auto rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Entrez le numéro de téléphone pour envoyer l&apos;invitation par WhatsApp. Format international recommandé (ex: +241XXXXXXXX).
            </p>

            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="+241 XX XX XX XX"
                value={whatsappModal.phone}
                onChange={(e) => setWhatsappModal({ ...whatsappModal, phone: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleWhatsappModalSubmit()}
                autoFocus
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              />
              <button
                onClick={handleWhatsappModalSubmit}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition shadow-sm"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Envoyer
              </button>
            </div>

            <button
              onClick={() => {
                openWhatsApp(whatsappModal.guest, "");
                setWhatsappModal(null);
              }}
              className="mt-3 w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Envoyer sans numéro (partager le lien uniquement)
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="space-y-3">
        {/* Search + Actions Row */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="search"
            placeholder="Rechercher un invité..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-auto sm:flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 sm:py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
          />
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="flex-1 sm:flex-none rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 sm:py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              📥 CSV
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#7A3A50] px-4 py-2 sm:py-1.5 text-xs font-semibold text-white hover:bg-[#6A2A40] transition"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span className="sm:inline">Ajouter</span>
            </button>
          </div>
        </div>
        {/* Filter Pills — horizontally scrollable on mobile */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {[
            { key: "all", label: "Tous" },
            { key: "CONFIRMED", label: "✅ Confirmés" },
            { key: "DECLINED", label: "❌ Déclinés" },
            { key: "INVITED", label: "⏳ En attente" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-lg px-3 py-2 sm:py-1.5 text-xs font-medium transition ${
                filter === f.key
                  ? "bg-[#7A3A50] text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add Guest Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddGuest}
          className="rounded-xl border border-[#7A3A50]/20 dark:border-[#7A3A50]/30 bg-[#7A3A50]/5 dark:bg-[#7A3A50]/10 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Nouvel invité
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              title="Fermer"
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              placeholder="Prénom *"
              required
              value={newGuest.firstName}
              onChange={(e) => setNewGuest((p) => ({ ...p, firstName: e.target.value }))}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none"
            />
            <input
              type="text"
              placeholder="Nom *"
              required
              value={newGuest.lastName}
              onChange={(e) => setNewGuest((p) => ({ ...p, lastName: e.target.value }))}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none"
            />
            <input
              type="email"
              placeholder="Email"
              value={newGuest.email}
              onChange={(e) => setNewGuest((p) => ({ ...p, email: e.target.value }))}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none"
            />
            <input
              type="tel"
              placeholder="Téléphone"
              value={newGuest.phone}
              onChange={(e) => setNewGuest((p) => ({ ...p, phone: e.target.value }))}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none"
            />
            <button
              type="submit"
              disabled={isAdding}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#7A3A50] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6A2A40] disabled:opacity-50"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {isAdding ? "Ajout..." : "Ajouter"}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <span className="text-3xl">📭</span>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Aucun invité trouvé
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#7A3A50] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6A2A40]"
          >
            <UserPlus className="h-4 w-4" />
            Ajouter votre premier invité
          </button>
        </div>
      ) : (
        (() => {
          const totalPages = Math.ceil(filtered.length / CARDS_PER_PAGE);
          const safePage = Math.min(page, totalPages - 1);
          const pageGuests = filtered.slice(safePage * CARDS_PER_PAGE, (safePage + 1) * CARDS_PER_PAGE);

          return (
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Grille paginee — 4 cols × 3 lignes */}
              <div className="flex-1 min-h-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 h-full auto-rows-auto lg:auto-rows-fr">
                  {pageGuests.map((g) => {
                    const initials = `${g.firstName?.[0] || ""}${g.lastName?.[0] || ""}`.toUpperCase();
                    return (
                      <div
                        key={g.id}
                        className="flex flex-col rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition overflow-hidden min-h-0"
                      >
                        {/* Header */}
                        <div className="flex items-center gap-2.5 px-3 py-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7A3A50]/10 dark:bg-[#7A3A50]/20 text-[10px] font-bold text-[#7A3A50] dark:text-[#C48B90]">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                              {g.firstName} {g.lastName}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                              {g.email || g.phone || "Pas de contact"}
                            </p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${g.statusColor}`}>
                            {g.statusLabel}
                          </span>
                        </div>

                        {/* Infos RSVP */}
                        {g.adultCount > 0 && (
                          <div className="flex items-center gap-2 px-3 pb-1 text-[10px] text-gray-500 dark:text-gray-400">
                            <span>👤 {g.adultCount}A{g.childrenCount > 0 ? ` + ${g.childrenCount}E` : ""}</span>
                            {g.menuChoice && <span>· 🍽️ {g.menuChoice}</span>}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-800 px-2 py-1.5 sm:py-1 mt-auto">
                          <div className="flex items-center">
                            {g.inviteToken ? (
                              <>
                                <a href={getInviteUrl(g.inviteToken)} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1 text-[#7A3A50] dark:text-[#C48B90] hover:bg-[#7A3A50]/10 transition" title="Aperçu">
                                  <Eye className="h-3.5 w-3.5" />
                                </a>
                                <button onClick={() => handleCopyLink(g.id, g.inviteToken)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition" title="Copier le lien">
                                  {copiedId === g.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Link2 className="h-3.5 w-3.5" />}
                                </button>
                              </>
                            ) : (
                              <button onClick={() => handleGenerateToken(g.id)} disabled={generatingId === g.id} className="rounded-lg p-1 text-[#7A3A50] dark:text-[#C48B90] hover:bg-[#7A3A50]/10 transition" title="Générer un lien">
                                {generatingId === g.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center">
                            <button onClick={() => handleShareWhatsApp(g)} className="rounded-lg p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition" title="WhatsApp">
                              <WhatsAppIcon className="h-3.5 w-3.5" />
                            </button>
                            {g.email ? (
                              <button onClick={() => handleSendEmail(g)} disabled={sendingEmailId === g.id} className={`rounded-lg p-1 transition ${emailSentId === g.id ? "text-green-500" : "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"}`} title={emailSentId === g.id ? "Envoyé !" : "Email"}>
                                {sendingEmailId === g.id ? <Loader2 className="h-3 w-3 animate-spin" /> : emailSentId === g.id ? <Check className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                              </button>
                            ) : (
                              <span className="rounded-lg p-1 text-gray-300 dark:text-gray-600"><Mail className="h-3.5 w-3.5" /></span>
                            )}
                            <button onClick={() => handleDelete(g.id)} disabled={deletingId === g.id} className="rounded-lg p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-50" title="Supprimer">
                              {deletingId === g.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-3 sm:pt-2 shrink-0">
                <p className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500">
                  {filtered.length} invité{filtered.length !== 1 ? "s" : ""} · {safePage + 1}/{totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                    disabled={safePage === 0}
                    title="Page précédente"
                    className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {/* Show limited page numbers on mobile */}
                  {Array.from({ length: totalPages }, (_, i) => {
                    // On small screens, only show current page ± 1
                    if (totalPages > 5 && Math.abs(i - safePage) > 1 && i !== 0 && i !== totalPages - 1) {
                      if (i === safePage - 2 || i === safePage + 2) {
                        return <span key={i} className="text-[10px] text-gray-400 px-0.5">…</span>;
                      }
                      return null;
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-xs font-medium transition ${
                          i === safePage
                            ? "bg-[#7A3A50] text-white"
                            : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                    disabled={safePage >= totalPages - 1}
                    title="Page suivante"
                    className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
