"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";

interface AdminLayoutClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    plan?: string;
  };
  children: React.ReactNode;
}

export function AdminLayoutClient({ user, children }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const isEditPage = /\/events\/[^/]+\/edit/.test(pathname);

  return (
    // Charte §6.2 — Layout dashboard : fond citizen-surface-layout, sidebar flottante
    <div className="flex h-dvh overflow-hidden bg-citizen-surface-layout">
      <Suspense fallback={<div className="w-16 shrink-0" />}>
        <AdminSidebar user={user} />
      </Suspense>

      {/* Main content — contraint au viewport, scroll citizen */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        <main
          className={`flex-1 min-h-0 citizen-scrollbar ${
            isEditPage
              ? "overflow-hidden p-4 lg:p-6 pt-16 lg:pt-6"
              : "overflow-y-auto p-4 lg:p-6 pt-16 lg:pt-6"
          } safe-bottom`}
        >
          {isEditPage ? (
            <div className="h-full">{children}</div>
          ) : (
            <div className="mx-auto max-w-6xl">{children}</div>
          )}
        </main>
      </div>
    </div>
  );
}
