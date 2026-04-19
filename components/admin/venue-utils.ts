// Utils purs serveur/client pour venues — partagés entre onboarding, edit,
// et le server component /events/[id]/edit/page.tsx.
// Pas de directive "use client" ici pour rester utilisable depuis les server components.

// ─── Type partagé (dupliqué depuis venues-editor pour briser le cycle client↔server) ──
// venues-editor a `"use client"` ; importer un type de là-bas depuis un server component
// passe par tsc mais peut briser le RSC bundler. On duplique la definition (3 lignes).
export interface VenueDraft {
  name: string;
  address: string;
  /** Date en string "YYYY-MM-DD" (onboarding) ou ISO (edit) — convertie côté API */
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
}

/**
 * Convertit une venue stockée par Convex (date en timestamp ms) en brouillon
 * string (YYYY-MM-DD) pour le formulaire d'édition.
 */
export function venueFromConvex(v: {
  name: string;
  address: string;
  date: number;
  startTime?: string;
  endTime?: string;
  description?: string;
}): VenueDraft {
  const d = new Date(v.date);
  const isoDate = d.toISOString().slice(0, 10); // YYYY-MM-DD
  return {
    name: v.name,
    address: v.address,
    date: isoDate,
    startTime: v.startTime || "",
    endTime: v.endTime || "",
    description: v.description,
  };
}
