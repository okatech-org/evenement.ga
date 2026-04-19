"use client";

import Link from "next/link";

interface DemoBannerProps {
  accountType?: string;
}

export function DemoBanner({ accountType }: DemoBannerProps) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-200/20 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 px-4 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
        <span className="text-base">👁</span>
        <span className="font-medium">Mode démo</span>
        <span className="hidden sm:inline text-amber-700 dark:text-amber-300">
          — Vos modifications sont temporaires
        </span>
        {accountType && (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
            {accountType}
          </span>
        )}
      </div>
      <Link
        href="/register"
        className="shrink-0 rounded-full bg-gradient-to-r from-[#88734C] to-[#b59e5e] px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90"
      >
        Créer un vrai compte →
      </Link>
    </div>
  );
}
