"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { INVITATION_TIERS, formatPrice, CURRENCIES } from "@/lib/config";

interface EventSummary {
  _id: string;
  title: string;
  status: string;
  dates?: number[];
  tier?: string | null;
}

function CheckoutInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tierId = searchParams.get("tier");
  const tier = INVITATION_TIERS.find((t) => t.id === tierId);

  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        if (res.ok && Array.isArray(data.data)) {
          setEvents(data.data);
          if (data.data.length === 1) setSelectedEventId(data.data[0]._id);
        } else {
          setEvents([]);
        }
      } catch {
        setEvents([]);
      }
    })();
  }, []);

  if (!tier) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border border-gray-100 bg-white p-8 text-center">
        <p className="text-sm text-red-600">Forfait inconnu.</p>
        <Link href="/plans" className="mt-4 inline-block text-sm text-[#7A3A50] underline">
          Retour aux forfaits
        </Link>
      </div>
    );
  }

  if (tier.price === 0) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border border-gray-100 bg-white p-8 text-center">
        <p className="text-sm">Le forfait <strong>{tier.label}</strong> est gratuit — il est déjà inclus.</p>
        <Link href="/plans" className="mt-4 inline-block text-sm text-[#7A3A50] underline">
          Retour aux forfaits
        </Link>
      </div>
    );
  }

  async function handleCheckout() {
    if (!selectedEventId || !tier) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: tier.id, eventId: selectedEventId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "STRIPE_NOT_CONFIGURED") {
          setError(
            "Le paiement en ligne est temporairement indisponible. Contactez-nous pour finaliser votre commande."
          );
        } else {
          setError(data.error || `Erreur ${res.status}`);
        }
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Redirection vers Stripe impossible");
      }
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }

  const eur = CURRENCIES.find((c) => c.code === "EUR")!;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[#7A3A50] font-semibold mb-2">
          Finaliser votre achat
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Forfait {tier.label}
        </h1>
        <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
          {formatPrice(tier.price, eur)}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {tier.subtitle} · {tier.minGuests}–{tier.maxGuests} invités
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white dark:bg-gray-900 dark:border-gray-800 p-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Événement concerné
          </label>
          {events === null ? (
            <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ) : events.length === 0 ? (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              Vous n&apos;avez encore aucun événement. <Link href="/onboarding" className="underline">Créer un événement d&apos;abord</Link>.
            </div>
          ) : (
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
            >
              <option value="">Choisir un événement…</option>
              {events.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.title}
                  {e.tier ? ` (déjà : ${e.tier})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
          {tier.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 text-green-500">✓</span>
              {f}
            </li>
          ))}
        </ul>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={!selectedEventId || loading || !events || events.length === 0}
          className="block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: tier.color }}
        >
          {loading
            ? "Redirection vers le paiement…"
            : `Payer ${formatPrice(tier.price, eur)} avec Stripe`}
        </button>

        <p className="text-center text-[10px] text-gray-400">
          Paiement sécurisé par Stripe · Paiement unique par événement
        </p>
      </div>

      <div className="text-center">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-[#7A3A50] dark:hover:text-[#C48B90]"
        >
          ← Retour aux forfaits
        </button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto p-8 text-center text-sm text-gray-400">Chargement…</div>}>
      <CheckoutInner />
    </Suspense>
  );
}
