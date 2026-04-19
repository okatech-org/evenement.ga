import Stripe from "stripe";

/**
 * Instance Stripe partagée — instanciée uniquement si STRIPE_SECRET_KEY est défini.
 * Les routes API doivent appeler `requireStripe()` pour obtenir une instance sûre.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  // Considère comme non-configuré si valeur vide OU placeholder du .env.example.
  if (!key) return null;
  if (key.includes("your_stripe_secret") || key.includes("your-stripe")) return null;
  if (_stripe) return _stripe;
  // apiVersion omis : utilise la version par défaut du SDK installé.
  // Avoids coupling TS types to a specific Stripe API date literal.
  _stripe = new Stripe(key, {
    appInfo: { name: "EventFlow", url: "https://evenement.ga" },
  });
  return _stripe;
}

/**
 * Retourne l'instance Stripe ou lève si non configurée.
 * À utiliser dans les routes API qui ont besoin de Stripe.
 */
export function requireStripe(): Stripe {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error(
      "Stripe non configuré — définissez STRIPE_SECRET_KEY dans les variables d'environnement"
    );
  }
  return stripe;
}

/**
 * True si Stripe est configuré (utile pour fallback UI / messages).
 */
export function isStripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
