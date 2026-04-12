/**
 * Indicatifs téléphoniques de tous les pays francophones
 * Triés par pays (Afrique d'abord, puis Europe, Amériques, Océanie)
 */

export interface FrancophoneCountry {
  code: string;      // ISO 3166-1 alpha-2
  name: string;      // Nom en français
  dialCode: string;  // Indicatif avec +
  flag: string;      // Emoji drapeau
  placeholder: string; // Exemple de numéro local
}

export const FRANCOPHONE_COUNTRIES: FrancophoneCountry[] = [
  // ── Afrique ──────────────────────────────────────────
  { code: "GA", name: "Gabon",                   dialCode: "+241", flag: "🇬🇦", placeholder: "07 XX XX XX" },
  { code: "CM", name: "Cameroun",                dialCode: "+237", flag: "🇨🇲", placeholder: "6 XX XX XX XX" },
  { code: "CI", name: "Côte d'Ivoire",           dialCode: "+225", flag: "🇨🇮", placeholder: "07 XX XX XX XX" },
  { code: "SN", name: "Sénégal",                 dialCode: "+221", flag: "🇸🇳", placeholder: "77 XXX XX XX" },
  { code: "CD", name: "RD Congo",                dialCode: "+243", flag: "🇨🇩", placeholder: "99 XXX XX XX" },
  { code: "CG", name: "Congo-Brazzaville",       dialCode: "+242", flag: "🇨🇬", placeholder: "06 XXX XX XX" },
  { code: "BF", name: "Burkina Faso",            dialCode: "+226", flag: "🇧🇫", placeholder: "7X XX XX XX" },
  { code: "ML", name: "Mali",                    dialCode: "+223", flag: "🇲🇱", placeholder: "7X XX XX XX" },
  { code: "NE", name: "Niger",                   dialCode: "+227", flag: "🇳🇪", placeholder: "9X XX XX XX" },
  { code: "TD", name: "Tchad",                   dialCode: "+235", flag: "🇹🇩", placeholder: "6X XX XX XX" },
  { code: "GN", name: "Guinée",                  dialCode: "+224", flag: "🇬🇳", placeholder: "6XX XX XX XX" },
  { code: "BJ", name: "Bénin",                   dialCode: "+229", flag: "🇧🇯", placeholder: "9X XX XX XX" },
  { code: "TG", name: "Togo",                    dialCode: "+228", flag: "🇹🇬", placeholder: "9X XX XX XX" },
  { code: "MG", name: "Madagascar",              dialCode: "+261", flag: "🇲🇬", placeholder: "34 XX XXX XX" },
  { code: "CF", name: "Centrafrique",            dialCode: "+236", flag: "🇨🇫", placeholder: "7X XX XX XX" },
  { code: "GQ", name: "Guinée équatoriale",      dialCode: "+240", flag: "🇬🇶", placeholder: "222 XXX XXX" },
  { code: "DJ", name: "Djibouti",                dialCode: "+253", flag: "🇩🇯", placeholder: "77 XX XX XX" },
  { code: "KM", name: "Comores",                 dialCode: "+269", flag: "🇰🇲", placeholder: "3XX XX XX" },
  { code: "MR", name: "Mauritanie",              dialCode: "+222", flag: "🇲🇷", placeholder: "XX XX XX XX" },
  { code: "RW", name: "Rwanda",                  dialCode: "+250", flag: "🇷🇼", placeholder: "7XX XXX XXX" },
  { code: "BI", name: "Burundi",                 dialCode: "+257", flag: "🇧🇮", placeholder: "7X XX XX XX" },
  { code: "SC", name: "Seychelles",              dialCode: "+248", flag: "🇸🇨", placeholder: "2 XX XX XX" },
  { code: "MU", name: "Maurice",                 dialCode: "+230", flag: "🇲🇺", placeholder: "5XXX XXXX" },
  { code: "MA", name: "Maroc",                   dialCode: "+212", flag: "🇲🇦", placeholder: "6XX XX XX XX" },
  { code: "TN", name: "Tunisie",                 dialCode: "+216", flag: "🇹🇳", placeholder: "XX XXX XXX" },
  { code: "DZ", name: "Algérie",                 dialCode: "+213", flag: "🇩🇿", placeholder: "5XX XX XX XX" },

  // ── Europe ───────────────────────────────────────────
  { code: "FR", name: "France",                  dialCode: "+33",  flag: "🇫🇷", placeholder: "6 XX XX XX XX" },
  { code: "BE", name: "Belgique",                dialCode: "+32",  flag: "🇧🇪", placeholder: "4XX XX XX XX" },
  { code: "CH", name: "Suisse",                  dialCode: "+41",  flag: "🇨🇭", placeholder: "7X XXX XX XX" },
  { code: "LU", name: "Luxembourg",              dialCode: "+352", flag: "🇱🇺", placeholder: "6XX XXX XXX" },
  { code: "MC", name: "Monaco",                  dialCode: "+377", flag: "🇲🇨", placeholder: "6 XX XX XX XX" },

  // ── Amériques ────────────────────────────────────────
  { code: "CA", name: "Canada",                  dialCode: "+1",   flag: "🇨🇦", placeholder: "XXX XXX XXXX" },
  { code: "HT", name: "Haïti",                   dialCode: "+509", flag: "🇭🇹", placeholder: "XX XX XXXX" },

  // ── Océanie / Asie ───────────────────────────────────
  { code: "VU", name: "Vanuatu",                 dialCode: "+678", flag: "🇻🇺", placeholder: "5X XXXXX" },
  { code: "LA", name: "Laos",                    dialCode: "+856", flag: "🇱🇦", placeholder: "20 XX XXX XXX" },
  { code: "VN", name: "Vietnam",                 dialCode: "+84",  flag: "🇻🇳", placeholder: "9X XXX XX XX" },
  { code: "LB", name: "Liban",                   dialCode: "+961", flag: "🇱🇧", placeholder: "XX XXX XXX" },
];

/** Trouve un pays par son code ISO */
export function findCountryByCode(code: string): FrancophoneCountry | undefined {
  return FRANCOPHONE_COUNTRIES.find((c) => c.code === code);
}

/** Détecte le pays le plus probable à partir d'un numéro */
export function detectCountryFromNumber(phone: string): FrancophoneCountry | undefined {
  const clean = phone.replace(/\s/g, "");
  if (!clean.startsWith("+")) return undefined;

  // Trier par longueur d'indicatif décroissante pour matcher le plus spécifique d'abord
  const sorted = [...FRANCOPHONE_COUNTRIES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );

  return sorted.find((c) => clean.startsWith(c.dialCode));
}
