// Helper partage client / serveur pour afficher un invite dans le chat
// sous la forme "Prenom I." — avec support des noms composes ("D.M.")

export function formatGuestDisplayName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  const first = (firstName ?? "").trim();
  const last = (lastName ?? "").trim();
  const initials = last
    .split(/[\s\-']+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + ".")
    .join("");
  if (!first && !initials) return "Invité";
  if (!first) return initials;
  if (!initials) return first;
  return `${first} ${initials}`;
}
