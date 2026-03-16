/**
 * Public layout — Carte d'invitation isolée
 *
 * Ce layout ne contient AUCUNE référence à EventFlow.
 * L'invité doit voir uniquement la carte d'invitation de l'événement.
 * Pas de header, pas de footer, pas de navigation, pas de logo.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
