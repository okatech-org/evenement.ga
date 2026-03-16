import { redirect } from "next/navigation";

/**
 * Admin layout — Interface organisateur
 *
 * Protégé par authentification (middleware.ts).
 * Contient le header admin, la sidebar, et les providers nécessaires.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO Phase 1: Replace with real auth check
  // const session = await auth();
  // if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* TODO Phase 2.1: Full admin sidebar + header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#7A3A50]">EventFlow</h1>
          <nav className="flex gap-4 text-sm text-gray-600">
            <a href="/dashboard" className="hover:text-[#7A3A50]">
              Dashboard
            </a>
            <a href="/events" className="hover:text-[#7A3A50]">
              Événements
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
