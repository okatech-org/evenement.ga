"use client";

import { useEffect, useState } from "react";
import type { GuestInfo } from "@/components/public/invitation-card";

const DEFAULT_MENU_OPTIONS = ["Classique", "Halal", "Végétarien", "Vegan", "Menu enfant"];

interface RsvpFormProps {
  eventId: string;
  showMenu: boolean;
  showChildren: boolean;
  colors: {
    primary: string;
    accent: string;
    muted: string;
    border: string;
    text: string;
    surface: string;
  };
  guestInfo?: GuestInfo;
  /** Options de menu — dynamiques depuis les étapes du programme, sinon défauts */
  menuOptions?: string[];
  /** Timestamp ms. Si dans le passé, le formulaire est verrouillé. */
  rsvpDeadline?: number | null;
}

type FieldErrors = Partial<Record<"firstName" | "lastName" | "email" | "adultCount" | "childrenCount" | "message", string>>;

export function RsvpForm({
  eventId,
  showMenu,
  showChildren,
  colors,
  guestInfo,
  menuOptions,
  rsvpDeadline,
}: RsvpFormProps) {
  const existingRsvp = guestInfo?.rsvp ?? null;
  const hasExistingRsvp = !!existingRsvp;

  const [formData, setFormData] = useState({
    firstName: guestInfo?.firstName || "",
    lastName: guestInfo?.lastName || "",
    email: guestInfo?.email || "",
    presence: guestInfo?.presence ?? true,
    adultCount: existingRsvp?.adultCount ?? 1,
    childrenCount: existingRsvp?.childrenCount ?? 0,
    menuChoice: existingRsvp?.menuChoice ?? "",
    allergies: existingRsvp?.allergies?.join(", ") ?? "",
    message: existingRsvp?.message ?? "",
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isEditing, setIsEditing] = useState(false);

  // Deadline check
  const deadlinePassed = !!(rsvpDeadline && Date.now() > rsvpDeadline);
  const deadlineFormatted = rsvpDeadline
    ? new Date(rsvpDeadline).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })
    : null;

  // If already RSVP'd as confirmed, show QR immediately
  const [showQrLoading, setShowQrLoading] = useState(false);

  // Load QR for already-confirmed guests
  useEffect(() => {
    let cancelled = false;
    async function loadExistingQr() {
      if (!guestInfo?.qrToken || !guestInfo.inviteToken) return;
      setShowQrLoading(true);
      try {
        const res = await fetch(
          `/api/events/${eventId}/qr/public?token=${guestInfo.inviteToken}`
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success) setQrDataUrl(data.data.qrDataUrl);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setShowQrLoading(false);
      }
    }
    if (submitted && !qrDataUrl && !showQrLoading && guestInfo?.qrToken) {
      loadExistingQr();
    }
    return () => {
      cancelled = true;
    };
  }, [submitted, qrDataUrl, showQrLoading, guestInfo?.qrToken, guestInfo?.inviteToken, eventId]);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!formData.firstName.trim()) errors.firstName = "Le prénom est requis";
    if (!formData.lastName.trim()) errors.lastName = "Le nom est requis";
    if (!guestInfo && formData.email) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
      if (!emailOk) errors.email = "Email invalide";
    } else if (!guestInfo && !formData.email.trim()) {
      errors.email = "Email requis";
    }
    if (formData.presence) {
      if (formData.adultCount < 1 || formData.adultCount > 20) errors.adultCount = "Entre 1 et 20";
      if (formData.childrenCount < 0 || formData.childrenCount > 20) errors.childrenCount = "Entre 0 et 20";
    }
    if (formData.message.length > 500) errors.message = "Message trop long (max 500)";
    return errors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (deadlinePassed) return;

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("");
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          presence: formData.presence,
          adultCount: formData.adultCount,
          childrenCount: formData.childrenCount,
          menuChoice: formData.menuChoice || undefined,
          message: formData.message || undefined,
          guestToken: guestInfo?.inviteToken || undefined,
          allergies: formData.allergies
            ? formData.allergies.split(",").map((a) => a.trim()).filter(Boolean)
            : [],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (formData.presence) {
          setSubmitted(true);
          setSubmittedDecline(false);
          if (data.data?.qrDataUrl) setQrDataUrl(data.data.qrDataUrl);
        } else {
          setSubmittedDecline(true);
          setSubmitted(false);
        }
        setIsEditing(false);
      } else {
        if (res.status === 403 && data.error === "RSVP_CLOSED") {
          setError("La date limite de confirmation est dépassée.");
        } else if (data.details?.length) {
          setError(data.details.join(" · "));
        } else {
          setError(data.error || "Une erreur est survenue");
        }
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.surface,
  };

  const mergedMenuOptions = menuOptions && menuOptions.length > 0 ? menuOptions : DEFAULT_MENU_OPTIONS;
  const isPreRegistered = !!guestInfo;

  // ── Deadline passée : formulaire verrouillé ──
  if (deadlinePassed) {
    return (
      <div className="text-center py-8 space-y-3" role="status">
        <span className="text-4xl block">⏰</span>
        <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
          Confirmations clôturées
        </h3>
        <p className="text-sm" style={{ color: colors.muted }}>
          La date limite de confirmation a été dépassée
          {deadlineFormatted ? ` (${deadlineFormatted})` : ""}.
        </p>
        {hasExistingRsvp && (
          <p className="text-xs pt-2" style={{ color: colors.muted }}>
            Votre réponse : {guestInfo?.presence ? "✅ Confirmé" : "❌ Décliné"}
          </p>
        )}
      </div>
    );
  }

  // ── Deja confirmé + QR (mais modifiable) ──
  if (submitted && !isEditing) {
    return (
      <div className="text-center py-6 space-y-6">
        <span className="text-5xl block" aria-hidden="true">🎉</span>
        <div>
          <h3 className="text-xl font-semibold" style={{ color: colors.primary }}>
            {guestInfo ? `Merci ${guestInfo.firstName} !` : "Merci pour votre confirmation !"}
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
              <img src={qrDataUrl} alt="QR Code d'entrée" className="w-48 h-48" />
            </div>
            <p className="text-[11px]" style={{ color: colors.muted }}>
              Présentez ce QR code à l&apos;entrée de l&apos;événement
            </p>
            {guestInfo && (
              <p className="text-xs font-semibold" style={{ color: colors.primary }}>
                {guestInfo.firstName} {guestInfo.lastName}
              </p>
            )}
          </div>
        ) : showQrLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div
              className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
              style={{
                borderColor: `${colors.primary} transparent ${colors.primary} ${colors.primary}`,
              }}
            />
            <span className="text-sm" style={{ color: colors.muted }}>
              Chargement du QR code...
            </span>
          </div>
        ) : null}

        {/* Bouton modifier */}
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs underline hover:no-underline"
          style={{ color: colors.muted }}
        >
          ✏️ Modifier ma réponse
        </button>
      </div>
    );
  }

  // ── Declined mais modifiable ──
  if (submittedDecline && !isEditing) {
    return (
      <div className="text-center py-8 space-y-3">
        <span className="text-4xl block" aria-hidden="true">💌</span>
        <h3 className="text-xl font-semibold" style={{ color: colors.primary }}>
          Merci pour votre réponse
        </h3>
        <p className="text-sm" style={{ color: colors.muted }}>
          Nous serons de tout cœur avec vous.
        </p>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs underline hover:no-underline pt-2"
          style={{ color: colors.muted }}
        >
          ✏️ Modifier ma réponse
        </button>
      </div>
    );
  }

  // ── Form ──
  return (
    <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3" noValidate>
      {/* Erreur globale */}
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600"
        >
          {error}
        </div>
      )}

      {/* Badge « Déjà confirmé — vous pouvez modifier » */}
      {hasExistingRsvp && (
        <div
          className="rounded-lg px-3 py-2 text-center text-xs"
          style={{
            backgroundColor: colors.primary + "10",
            color: colors.primary,
            border: `1px solid ${colors.primary}30`,
          }}
        >
          ✓ Déjà confirmé — vous pouvez mettre à jour votre réponse
        </div>
      )}

      {/* Countdown discret */}
      {deadlineFormatted && (
        <div className="text-center text-[10px]" style={{ color: colors.muted }}>
          À confirmer avant le {deadlineFormatted}
        </div>
      )}

      {/* Personalized greeting */}
      {isPreRegistered && !hasExistingRsvp && (
        <div
          className="rounded-lg px-3 py-2 text-center text-xs sm:text-sm"
          style={{
            backgroundColor: colors.primary + "10",
            color: colors.primary,
            border: `1px solid ${colors.primary}30`,
          }}
        >
          ✨ Invitation pour{" "}
          <strong>
            {guestInfo.firstName} {guestInfo.lastName}
          </strong>
        </div>
      )}

      {/* Presence Toggle */}
      <div className="flex gap-2 sm:gap-3" role="radiogroup" aria-label="Confirmation de présence">
        <button
          type="button"
          role="radio"
          aria-checked={formData.presence}
          onClick={() => setFormData((p) => ({ ...p, presence: true }))}
          className="flex-1 rounded-lg border px-3 py-2 text-xs sm:text-sm font-medium transition"
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
          role="radio"
          aria-checked={!formData.presence}
          onClick={() => setFormData((p) => ({ ...p, presence: false }))}
          className="flex-1 rounded-lg border px-3 py-2 text-xs sm:text-sm font-medium transition"
          style={{
            borderColor: !formData.presence ? colors.primary : colors.border,
            backgroundColor: !formData.presence ? colors.primary + "15" : "transparent",
            color: !formData.presence ? colors.primary : colors.muted,
          }}
        >
          😔 Je ne pourrai pas
        </button>
      </div>

      {/* Name fields */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label
            htmlFor="rsvp-first-name"
            className="mb-0.5 block text-[10px] sm:text-xs font-medium"
            style={{ color: colors.muted }}
          >
            Prénom *
          </label>
          <input
            id="rsvp-first-name"
            type="text"
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.firstName}
            aria-describedby={fieldErrors.firstName ? "rsvp-first-name-err" : undefined}
            value={formData.firstName}
            onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
            disabled={isPreRegistered}
            className="w-full rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm outline-none disabled:opacity-60"
            style={inputStyle}
          />
          {fieldErrors.firstName && (
            <span id="rsvp-first-name-err" role="alert" className="mt-0.5 block text-[10px] text-red-600">
              {fieldErrors.firstName}
            </span>
          )}
        </div>
        <div>
          <label
            htmlFor="rsvp-last-name"
            className="mb-0.5 block text-[10px] sm:text-xs font-medium"
            style={{ color: colors.muted }}
          >
            Nom *
          </label>
          <input
            id="rsvp-last-name"
            type="text"
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.lastName}
            aria-describedby={fieldErrors.lastName ? "rsvp-last-name-err" : undefined}
            value={formData.lastName}
            onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
            disabled={isPreRegistered}
            className="w-full rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm outline-none disabled:opacity-60"
            style={inputStyle}
          />
          {fieldErrors.lastName && (
            <span id="rsvp-last-name-err" role="alert" className="mt-0.5 block text-[10px] text-red-600">
              {fieldErrors.lastName}
            </span>
          )}
        </div>
      </div>

      {!isPreRegistered && (
        <div>
          <label
            htmlFor="rsvp-email"
            className="mb-0.5 block text-[10px] sm:text-xs font-medium"
            style={{ color: colors.muted }}
          >
            Email *
          </label>
          <input
            id="rsvp-email"
            type="email"
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "rsvp-email-err" : undefined}
            value={formData.email || ""}
            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            className="w-full rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm outline-none"
            style={inputStyle}
          />
          {fieldErrors.email && (
            <span id="rsvp-email-err" role="alert" className="mt-0.5 block text-[10px] text-red-600">
              {fieldErrors.email}
            </span>
          )}
        </div>
      )}

      {/* Guest counts (only if attending) */}
      {formData.presence && (
        <>
          <div className={`grid ${showChildren ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
            <div>
              <label
                htmlFor="rsvp-adults"
                className="mb-0.5 block text-[10px] sm:text-xs font-medium"
                style={{ color: colors.muted }}
              >
                Adultes
              </label>
              <input
                id="rsvp-adults"
                type="number"
                min={1}
                max={20}
                aria-invalid={!!fieldErrors.adultCount}
                aria-describedby={fieldErrors.adultCount ? "rsvp-adults-err" : undefined}
                value={formData.adultCount}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, adultCount: parseInt(e.target.value) || 1 }))
                }
                className="w-full rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm outline-none"
                style={inputStyle}
              />
              {fieldErrors.adultCount && (
                <span id="rsvp-adults-err" role="alert" className="mt-0.5 block text-[10px] text-red-600">
                  {fieldErrors.adultCount}
                </span>
              )}
            </div>
            {showChildren && (
              <div>
                <label
                  htmlFor="rsvp-children"
                  className="mb-0.5 block text-[10px] sm:text-xs font-medium"
                  style={{ color: colors.muted }}
                >
                  Enfants
                </label>
                <input
                  id="rsvp-children"
                  type="number"
                  min={0}
                  max={20}
                  aria-invalid={!!fieldErrors.childrenCount}
                  aria-describedby={fieldErrors.childrenCount ? "rsvp-children-err" : undefined}
                  value={formData.childrenCount}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, childrenCount: parseInt(e.target.value) || 0 }))
                  }
                  className="w-full rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm outline-none"
                  style={inputStyle}
                />
                {fieldErrors.childrenCount && (
                  <span id="rsvp-children-err" role="alert" className="mt-0.5 block text-[10px] text-red-600">
                    {fieldErrors.childrenCount}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Menu + Allergies */}
          <div className={showMenu ? "grid grid-cols-1 sm:grid-cols-2 gap-2" : ""}>
            {showMenu && (
              <div>
                <label
                  htmlFor="rsvp-menu"
                  className="mb-0.5 block text-[10px] sm:text-xs font-medium"
                  style={{ color: colors.muted }}
                >
                  Choix du menu
                </label>
                <select
                  id="rsvp-menu"
                  value={formData.menuChoice}
                  onChange={(e) => setFormData((p) => ({ ...p, menuChoice: e.target.value }))}
                  className="w-full rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm outline-none"
                  style={inputStyle}
                >
                  <option value="">Sélectionner</option>
                  {mergedMenuOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label
                htmlFor="rsvp-allergies"
                className="mb-0.5 block text-[10px] sm:text-xs font-medium"
                style={{ color: colors.muted }}
              >
                Allergies / Régimes
              </label>
              <input
                id="rsvp-allergies"
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData((p) => ({ ...p, allergies: e.target.value }))}
                className="w-full rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm outline-none"
                style={inputStyle}
                placeholder="gluten, lactose..."
              />
            </div>
          </div>
        </>
      )}

      {/* Message */}
      <div>
        <label
          htmlFor="rsvp-message"
          className="mb-0.5 block text-[10px] sm:text-xs font-medium"
          style={{ color: colors.muted }}
        >
          Un petit mot (optionnel)
        </label>
        <textarea
          id="rsvp-message"
          aria-invalid={!!fieldErrors.message}
          aria-describedby={fieldErrors.message ? "rsvp-message-err" : "rsvp-message-hint"}
          value={formData.message}
          onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
          className="w-full rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm outline-none"
          style={inputStyle}
          rows={2}
          placeholder="Félicitations..."
          maxLength={500}
        />
        {fieldErrors.message ? (
          <span id="rsvp-message-err" role="alert" className="mt-0.5 block text-[10px] text-red-600">
            {fieldErrors.message}
          </span>
        ) : (
          <span id="rsvp-message-hint" className="mt-0.5 block text-[9px]" style={{ color: colors.muted }}>
            {formData.message.length}/500
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white transition disabled:opacity-50"
        style={{ backgroundColor: colors.primary }}
      >
        {isSubmitting
          ? "Envoi..."
          : hasExistingRsvp || isEditing
          ? "Mettre à jour ma réponse"
          : formData.presence
          ? "Confirmer ma présence"
          : "Envoyer ma réponse"}
      </button>

      {isEditing && (
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="w-full text-xs underline"
          style={{ color: colors.muted }}
        >
          Annuler la modification
        </button>
      )}
    </form>
  );
}
