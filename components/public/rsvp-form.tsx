"use client";

import { useState } from "react";
import type { GuestInfo } from "@/components/public/invitation-card";

interface RsvpFormProps {
  eventId: string;
  showMenu: boolean;
  colors: {
    primary: string;
    accent: string;
    muted: string;
    border: string;
    text: string;
    surface: string;
  };
  guestInfo?: GuestInfo;
}

export function RsvpForm({ eventId, showMenu, colors, guestInfo }: RsvpFormProps) {
  const [formData, setFormData] = useState({
    firstName: guestInfo?.firstName || "",
    lastName: guestInfo?.lastName || "",
    email: guestInfo?.email || "",
    presence: true,
    adultCount: 1,
    childrenCount: 0,
    menuChoice: "",
    allergies: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(
    guestInfo?.hasRsvp && guestInfo.presence === true
  );
  const [submittedDecline, setSubmittedDecline] = useState(
    guestInfo?.hasRsvp && guestInfo.presence === false
  );
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  // If already RSVP'd as confirmed, show QR immediately
  const [showQrLoading, setShowQrLoading] = useState(false);

  // Load QR for already-confirmed guests
  async function loadExistingQr() {
    if (!guestInfo?.qrToken) return;
    setShowQrLoading(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/qr/public?token=${guestInfo.inviteToken}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setQrDataUrl(data.data.qrDataUrl);
        }
      }
    } catch {
      // silent
    }
    setShowQrLoading(false);
  }

  // Auto-load QR if already confirmed
  if (submitted && !qrDataUrl && !showQrLoading && guestInfo?.qrToken) {
    loadExistingQr();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          guestToken: guestInfo?.inviteToken || undefined,
          allergies: formData.allergies
            ? formData.allergies.split(",").map((a) => a.trim())
            : [],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (formData.presence) {
          setSubmitted(true);
          if (data.data?.qrDataUrl) {
            setQrDataUrl(data.data.qrDataUrl);
          }
        } else {
          setSubmittedDecline(true);
        }
      } else {
        const data = await res.json();
        setError(data.error || "Une erreur est survenue");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Already confirmed with QR ──
  if (submitted) {
    return (
      <div className="text-center py-6 space-y-6">
        <span className="text-5xl block">🎉</span>
        <div>
          <h3
            className="text-xl font-semibold"
            style={{ color: colors.primary }}
          >
            {guestInfo
              ? `Merci ${guestInfo.firstName} !`
              : "Merci pour votre confirmation !"}
          </h3>
          <p className="mt-2 text-sm" style={{ color: colors.muted }}>
            Nous avons hâte de vous accueillir.
          </p>
        </div>

        {/* QR Code */}
        {qrDataUrl ? (
          <div className="space-y-3">
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: colors.muted }}
            >
              Votre QR Code d&apos;entrée
            </p>
            <div
              className="inline-block rounded-2xl p-4"
              style={{
                backgroundColor: "#FFFFFF",
                border: `2px solid ${colors.border}`,
                boxShadow: `0 8px 32px ${colors.primary}15`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="QR Code d'entrée"
                className="w-48 h-48"
              />
            </div>
            <p className="text-[11px]" style={{ color: colors.muted }}>
              Présentez ce QR code à l&apos;entrée de l&apos;événement
            </p>
            {guestInfo && (
              <p
                className="text-xs font-semibold"
                style={{ color: colors.primary }}
              >
                {guestInfo.firstName} {guestInfo.lastName}
              </p>
            )}
          </div>
        ) : showQrLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div
              className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: `${colors.primary} transparent ${colors.primary} ${colors.primary}` }}
            />
            <span className="text-sm" style={{ color: colors.muted }}>
              Chargement du QR code...
            </span>
          </div>
        ) : null}
      </div>
    );
  }

  // ── Declined ──
  if (submittedDecline) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl">💌</span>
        <h3
          className="mt-4 text-xl font-semibold"
          style={{ color: colors.primary }}
        >
          Merci pour votre réponse
        </h3>
        <p className="mt-2 text-sm" style={{ color: colors.muted }}>
          Nous serons de tout cœur avec vous.
        </p>
      </div>
    );
  }

  // ── Form ──
  const inputStyle = {
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.surface,
  };

  const isPreRegistered = !!guestInfo;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Personalized greeting */}
      {isPreRegistered && (
        <div
          className="rounded-xl px-4 py-3 text-center text-sm"
          style={{
            backgroundColor: colors.primary + "10",
            color: colors.primary,
            border: `1px solid ${colors.primary}30`,
          }}
        >
          ✨ Invitation personnalisée pour{" "}
          <strong>
            {guestInfo.firstName} {guestInfo.lastName}
          </strong>
        </div>
      )}

      {/* Presence Toggle */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setFormData((p) => ({ ...p, presence: true }))}
          className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition"
          style={{
            borderColor: formData.presence ? colors.primary : colors.border,
            backgroundColor: formData.presence ? colors.primary + "15" : "transparent",
            color: formData.presence ? colors.primary : colors.muted,
          }}
        >
          ✅ J&apos;y serai !
        </button>
        <button
          type="button"
          onClick={() => setFormData((p) => ({ ...p, presence: false }))}
          className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition"
          style={{
            borderColor: !formData.presence ? colors.primary : colors.border,
            backgroundColor: !formData.presence ? colors.primary + "15" : "transparent",
            color: !formData.presence ? colors.primary : colors.muted,
          }}
        >
          😔 Je ne pourrai pas
        </button>
      </div>

      {/* Name fields — locked if pre-registered */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: colors.muted }}>
            Prénom *
          </label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
            disabled={isPreRegistered}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none disabled:opacity-60"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: colors.muted }}>
            Nom *
          </label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
            disabled={isPreRegistered}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none disabled:opacity-60"
            style={inputStyle}
          />
        </div>
      </div>

      {!isPreRegistered && (
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: colors.muted }}>
            Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </div>
      )}

      {/* Guest counts (only if attending) */}
      {formData.presence && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: colors.muted }}>
                Adultes
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={formData.adultCount}
                onChange={(e) => setFormData((p) => ({ ...p, adultCount: parseInt(e.target.value) || 1 }))}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: colors.muted }}>
                Enfants
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={formData.childrenCount}
                onChange={(e) => setFormData((p) => ({ ...p, childrenCount: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Menu choice */}
          {showMenu && (
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: colors.muted }}>
                Choix du menu
              </label>
              <select
                value={formData.menuChoice}
                onChange={(e) => setFormData((p) => ({ ...p, menuChoice: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={inputStyle}
              >
                <option value="">Sélectionner</option>
                <option value="classique">Classique</option>
                <option value="halal">Halal</option>
                <option value="végétarien">Végétarien</option>
                <option value="vegan">Vegan</option>
                <option value="enfant">Menu enfant</option>
              </select>
            </div>
          )}

          {/* Allergies */}
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: colors.muted }}>
              Allergies / Régimes (séparés par des virgules)
            </label>
            <input
              type="text"
              value={formData.allergies}
              onChange={(e) => setFormData((p) => ({ ...p, allergies: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={inputStyle}
              placeholder="gluten, lactose..."
            />
          </div>
        </>
      )}

      {/* Message */}
      <div>
        <label className="mb-1 block text-xs font-medium" style={{ color: colors.muted }}>
          Un petit mot (optionnel)
        </label>
        <textarea
          value={formData.message}
          onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={inputStyle}
          rows={3}
          placeholder="Félicitations..."
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
        style={{ backgroundColor: colors.primary }}
      >
        {isSubmitting ? "Envoi..." : formData.presence ? "Confirmer ma présence" : "Envoyer ma réponse"}
      </button>
    </form>
  );
}
