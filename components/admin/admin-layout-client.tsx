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
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <AdminSidebar user={user} />

      {/* Main content — contraint au viewport, pas de scroll de page */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        <main className={`flex-1 min-h-0 overflow-hidden ${isEditPage ? "p-4 lg:p-6 pt-16 lg:pt-6" : "p-4 lg:p-6 pt-16 lg:pt-6"}`}>
          {isEditPage ? (
            <div className="h-full">{children}</div>
          ) : (
            <div className="mx-auto max-w-6xl h-full">{children}</div>
          )}
        </main>
      </div>
    </div>
  );
}
