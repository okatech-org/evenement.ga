"use client";

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
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <AdminSidebar user={user} />

      {/* Main content — full-bleed on edit pages for split-pane layout */}
      <div className="flex flex-1 flex-col min-w-0">
        <main className={`flex-1 ${isEditPage ? "p-6 lg:p-8 pt-20 lg:pt-8" : "p-6 lg:p-8 pt-20 lg:pt-8"}`}>
          {isEditPage ? (
            <div>{children}</div>
          ) : (
            <div className="mx-auto max-w-6xl">{children}</div>
          )}
        </main>
      </div>
    </div>
  );
}
