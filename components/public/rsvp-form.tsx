"use client";
// noinspection CssInlineStyles

import { useState } from "react";
import type { GuestInfo } from "@/components/public/invitation-card";

const Div = 'div' as any;
const Form = 'form' as any;
const Button = 'button' as any;
const Input = 'input' as any;
const P = 'p' as any;
const H3 = 'h3' as any;
const Textarea = 'textarea' as any;
const Span = 'span' as any;
const Img = 'img' as any;


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
}

export function RsvpForm({ eventId, showMenu, showChildren, colors, guestInfo }: RsvpFormProps) {
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
      <Div className="text-center py-6 space-y-6">
        <Span className="text-5xl block">🎉</Span>
        <Div>
          <H3
            className="text-xl font-semibold"
            style={{ color: colors.primary}}
          >
            {guestInfo
              ? `Merci ${guestInfo.firstName} !`
              : "Merci pour votre confirmation !"}
          </H3>
          <P className="mt-2 text-sm" style={{ color: colors.muted}}>
            Nous avons hâte de vous accueillir.
          </P>
        </Div>

        {/* QR Code */}
        {qrDataUrl ? (
          <Div className="space-y-3">
            <P
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: colors.muted}}
            >
              Votre QR Code d&apos;entrée
            </P>
            <Div
              className="inline-block rounded-2xl p-4"
              style={{
                backgroundColor: "#FFFFFF",
                border: `2px solid ${colors.border}`,
                boxShadow: `0 8px 32px ${colors.primary}15`,}}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <Img
                src={qrDataUrl}
                alt="QR Code d'entrée"
                className="w-48 h-48"
              />
            </Div>
            <P className="text-[11px]" style={{ color: colors.muted}}>
              Présentez ce QR code à l&apos;entrée de l&apos;événement
            </P>
            {guestInfo && (
              <P
                className="text-xs font-semibold"
                style={{ color: colors.primary}}
              >
                {guestInfo.firstName} {guestInfo.lastName}
              </P>
            )}
          </Div>
        ) : showQrLoading ? (
          <Div className="flex items-center justify-center gap-2">
            <Div
              className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: `${colors.primary} transparent ${colors.primary} ${colors.primary}`}}
            />
            <Span className="text-sm" style={{ color: colors.muted}}>
              Chargement du QR code...
            </Span>
          </Div>
        ) : null}
      </Div>
    );
  }

  // ── Declined ──
  if (submittedDecline) {
    return (
      <Div className="text-center py-8">
        <Span className="text-4xl">💌</Span>
        <H3
          className="mt-4 text-xl font-semibold"
          style={{ color: colors.primary}}
        >
          Merci pour votre réponse
        </H3>
        <P className="mt-2 text-sm" style={{ color: colors.muted}}>
          Nous serons de tout cœur avec vous.
        </P>
      </Div>
    );
  }

  // ── Form ──
  const inputStyle = {
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.surface,
  };

  const isPreRegistered = !!guestInfo;

  // noinspection CssInlineStyles
  return (
    <Form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
      {error && (
        <Div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </Div>
      )}

      {/* Personalized greeting */}
      {isPreRegistered && (
        <Div
          className="rounded-lg px-3 py-2 text-center text-xs sm:text-sm"
          style={{
            backgroundColor: colors.primary + "10",
            color: colors.primary,
            border: `1px solid ${colors.primary}30`,}}
        >
          ✨ Invitation pour{" "}
          <strong>
            {guestInfo.firstName} {guestInfo.lastName}
          </strong>
        </Div>
      )}

      {/* Presence Toggle */}
      <Div className="flex gap-2 sm:gap-3">
        <Button
          type="button"
          onClick={() => setFormData((p) => ({ ...p, presence: true }))}
          className="flex-1 rounded-lg border px-3 py-2 text-xs sm:text-sm font-medium transition"
          style={{
            borderColor: formData.presence ? colors.primary : colors.border,
            backgroundColor: formData.presence ? colors.primary + "15" : "transparent",
            color: formData.presence ? colors.primary : colors.muted,}}
        >
          ✅ J&apos;y serai !
        </Button>
        <Button
          type="button"
          onClick={() => setFormData((p) => ({ ...p, presence: false }))}
          className="flex-1 rounded-lg border px-3 py-2 text-xs sm:text-sm font-medium transition"
          style={{
            borderColor: !formData.presence ? colors.primary : colors.border,
            backgroundColor: !formData.presence ? colors.primary + "15" : "transparent",
            color: !formData.presence ? colors.primary : colors.muted,}}
        >
          😔 Je ne pourrai pas
        </Button>
      </Div>

      {/* Name fields — locked if pre-registered */}
      <Div className="grid grid-cols-2 gap-2">
        <Div>
          <label htmlFor="rsvp-first-name" className="mb-0.5 block text-[10px] sm:text-xs font-medium" style={{ color: colors.muted}}>
            Prénom *
          </label>
          <Input
            id="rsvp-first-name"
            title="Prénom"
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
            disabled={isPreRegistered}
            className="w-full rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm outline-none disabled:opacity-60"
            style={inputStyle}
          />
        </Div>
        <Div>
          <label htmlFor="rsvp-last-name" className="mb-0.5 block text-[10px] sm:text-xs font-medium" style={{ color: colors.muted}}>
            Nom *
          </label>
          <Input
            id="rsvp-last-name"
            title="Nom"
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
            disabled={isPreRegistered}
            className="w-full rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm outline-none disabled:opacity-60"
            style={inputStyle}
          />
        </Div>
      </Div>

      {!isPreRegistered && (
        <Div>
          <label htmlFor="rsvp-email" className="mb-0.5 block text-[10px] sm:text-xs font-medium" style={{ color: colors.muted}}>
            Email *
          </label>
          <Input
            id="rsvp-email"
            title="Adresse email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            className="w-full rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm outline-none"
            style={inputStyle}
          />
        </Div>
      )}

      {/* Guest counts (only if attending) */}
      {formData.presence && (
        <>
          <Div className={`grid ${showChildren ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
            <Div>
              <label htmlFor="rsvp-adults" className="mb-0.5 block text-[10px] sm:text-xs font-medium" style={{ color: colors.muted}}>
                Adultes
              </label>
              <Input
                id="rsvp-adults"
                title="Nombre d'adultes"
                type="number"
                min={1}
                max={10}
                value={formData.adultCount}
                onChange={(e) => setFormData((p) => ({ ...p, adultCount: parseInt(e.target.value) || 1 }))}
                className="w-full rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm outline-none"
                style={inputStyle}
              />
            </Div>
            {showChildren && (
            <Div>
              <label htmlFor="rsvp-children" className="mb-0.5 block text-[10px] sm:text-xs font-medium" style={{ color: colors.muted}}>
                Enfants
              </label>
              <Input
                id="rsvp-children"
                title="Nombre d'enfants"
                type="number"
                min={0}
                max={10}
                value={formData.childrenCount}
                onChange={(e) => setFormData((p) => ({ ...p, childrenCount: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm outline-none"
                style={inputStyle}
              />
            </Div>
            )}
          </Div>

          {/* Menu + Allergies en 2 colonnes sur desktop, empilés sur mobile */}
          <Div className={showMenu ? "grid grid-cols-1 sm:grid-cols-2 gap-2" : ""}>
            {showMenu && (
              <Div>
                <label htmlFor="rsvp-menu" className="mb-0.5 block text-[10px] sm:text-xs font-medium" style={{ color: colors.muted}}>
                  Choix du menu
                </label>
                <select
                  id="rsvp-menu"
                  title="Choix du menu"
                  value={formData.menuChoice}
                  onChange={(e) => setFormData((p) => ({ ...p, menuChoice: e.target.value }))}
                  className="w-full rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm outline-none"
                  style={inputStyle}
                >
                  <option value="">Sélectionner</option>
                  <option value="classique">Classique</option>
                  <option value="halal">Halal</option>
                  <option value="végétarien">Végétarien</option>
                  <option value="vegan">Vegan</option>
                  <option value="enfant">Menu enfant</option>
                </select>
              </Div>
            )}
            <Div>
              <label htmlFor="rsvp-allergies" className="mb-0.5 block text-[10px] sm:text-xs font-medium" style={{ color: colors.muted}}>
                Allergies / Régimes
              </label>
              <Input
                id="rsvp-allergies"
                title="Allergies éventuelles"
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData((p) => ({ ...p, allergies: e.target.value }))}
                className="w-full rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm outline-none"
                style={inputStyle}
                placeholder="gluten, lactose..."
              />
            </Div>
          </Div>
        </>
      )}

      {/* Message */}
      <Div>
        <label htmlFor="rsvp-message" className="mb-0.5 block text-[10px] sm:text-xs font-medium" style={{ color: colors.muted}}>
          Un petit mot (optionnel)
        </label>
        <Textarea
          id="rsvp-message"
          title="Laissez un message"
          value={formData.message}
          onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
          className="w-full rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm outline-none"
          style={inputStyle}
          rows={2}
          placeholder="Félicitations..."
        />
      </Div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white transition disabled:opacity-50"
        style={{ backgroundColor: colors.primary}}
      >
        {isSubmitting ? "Envoi..." : formData.presence ? "Confirmer ma présence" : "Envoyer ma réponse"}
      </Button>
    </Form>
  );
}
