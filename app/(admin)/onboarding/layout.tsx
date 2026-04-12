import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un événement | EventFlow",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
