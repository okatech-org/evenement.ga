"use client";

import { useEffect } from "react";

export default function SuperAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erreur superadmin:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="mx-auto max-w-md text-center">
        <h2 className="mb-2 text-xl font-semibold">Erreur Super Admin</h2>
        <p className="mb-6 text-muted-foreground">
          Une erreur est survenue dans le panneau d&apos;administration.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Réessayer
          </button>
          <a
            href="/superadmin"
            className="rounded-lg border px-6 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Retour au panel
          </a>
        </div>
      </div>
    </div>
  );
}
