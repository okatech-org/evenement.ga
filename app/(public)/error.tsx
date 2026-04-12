"use client";

import { useEffect } from "react";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erreur page publique:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="mx-auto max-w-md text-center">
        <h2 className="mb-2 text-xl font-semibold">
          Page introuvable ou indisponible
        </h2>
        <p className="mb-6 text-muted-foreground">
          Cette invitation n&apos;est peut-être plus disponible.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
