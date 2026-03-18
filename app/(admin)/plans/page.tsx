"use client";

import { useState } from "react";
import Link from "next/link";
import { INVITATION_TIERS, CURRENCIES, convertPrice, formatPrice } from "@/lib/config";
import type { Currency } from "@/lib/config";

export default function PlansPage() {
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]); // EUR default
  const [currencyOpen, setCurrencyOpen] = useState(false);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[#7A3A50] dark:text-[#C48B90] font-semibold mb-2">
          💍 Mariage
        </p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Plans & Tarifs
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Choisissez le forfait adapté à la taille de votre mariage
        </p>

        {/* Currency selector + badge */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-green-50 dark:bg-green-950/30 px-4 py-1.5 text-xs font-medium text-green-700 dark:text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Prix par événement · Paiement unique
          </span>

          {/* Currency dropdown */}
          <div className="relative">
            <button
              onClick={() => setCurrencyOpen(!currencyOpen)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <span>{currency.flag}</span>
              <span>{currency.code}</span>
              <span className="text-gray-400 text-[10px]">▼</span>
            </button>
            {currencyOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => { setCurrency(c); setCurrencyOpen(false); }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs text-left transition ${
                      currency.code === c.code
                        ? "bg-[#7A3A50]/10 text-[#7A3A50] dark:text-[#C48B90] font-semibold"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span className="text-base">{c.flag}</span>
                    <span>{c.label}</span>
                    <span className="ml-auto text-[10px] text-gray-400">{c.symbol}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tiers grid */}
      <div className="mx-auto max-w-6xl grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {INVITATION_TIERS.map((tier) => {
          const localPrice = convertPrice(tier.price, currency);

          return (
            <div
              key={tier.id}
              className={`relative rounded-2xl border p-5 transition-all hover:shadow-lg dark:bg-gray-900 ${
                tier.popular
                  ? "border-[#7A3A50] ring-2 ring-[#7A3A50]/20 shadow-lg scale-[1.02]"
                  : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
              }`}
            >
              {/* Popular badge */}
              {tier.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#7A3A50] px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wide whitespace-nowrap">
                  ⭐ Populaire
                </span>
              )}

              {/* Tier header */}
              <div className="text-center mb-4">
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: tier.color }}
                >
                  {tier.label}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {tier.subtitle}
                </p>
                <div className="mt-2">
                  {tier.price === 0 ? (
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      Gratuit
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatPrice(localPrice, currency)}
                    </p>
                  )}
                </div>

                {/* Guest range badge */}
                <div
                  className="mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{
                    backgroundColor: tier.color + "15",
                    color: tier.color,
                    border: `1px solid ${tier.color}30`,
                  }}
                >
                  👥 {tier.minGuests === 1 ? "1" : tier.minGuests} – {tier.maxGuests.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} invités
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-5">
                {tier.features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[13px] text-gray-600 dark:text-gray-400"
                  >
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {tier.price === 0 ? (
                <div className="w-full rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  Inclus
                </div>
              ) : (
                <button
                  className="block w-full rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
                  style={{ backgroundColor: tier.color }}
                >
                  Choisir
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            💡 Comment ça marche ?
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { n: "1", t: "Créez votre mariage", d: "Personnalisez votre carte d'invitation" },
              { n: "2", t: "Choisissez votre plan", d: "Selon le nombre d'invités prévu" },
              { n: "3", t: "Envoyez vos invitations", d: "QR codes et liens personnalisés" },
            ].map((step) => (
              <div key={step.n} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7A3A50]/10 text-sm font-bold text-[#7A3A50] dark:text-[#C48B90]">
                  {step.n}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{step.t}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mx-auto max-w-3xl space-y-3">
        <h3 className="text-center text-sm font-semibold text-gray-900 dark:text-white">
          Questions fréquentes
        </h3>
        {[
          {
            q: "Puis-je changer de plan en cours d'événement ?",
            a: "Oui, vous pouvez passer à un plan supérieur à tout moment. La différence de prix sera calculée automatiquement.",
          },
          {
            q: "Que se passe-t-il si je dépasse le nombre d'invités ?",
            a: "Vous serez invité à passer au plan supérieur pour continuer à ajouter des invités.",
          },
          {
            q: "Le paiement est-il unique ou récurrent ?",
            a: "Le paiement est unique, par événement. Pas d'abonnement, pas de frais cachés.",
          },
          {
            q: "Plus de 2 000 invités ?",
            a: "Contactez-nous pour un devis personnalisé adapté à votre méga mariage.",
          },
        ].map((faq, i) => (
          <details
            key={i}
            className="group rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3"
          >
            <summary className="cursor-pointer text-sm font-medium text-gray-900 dark:text-white list-none flex items-center justify-between">
              {faq.q}
              <span className="text-gray-400 group-open:rotate-180 transition-transform text-xs">▼</span>
            </summary>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {faq.a}
            </p>
          </details>
        ))}
      </div>

      <div className="text-center">
        <Link
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-[#7A3A50] dark:hover:text-[#C48B90]"
        >
          ← Retour au dashboard
        </Link>
      </div>
    </div>
  );
}
