import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { QRScanner } from "@/components/admin/qr-scanner";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export default async function EventScannerPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  // Migré Prisma → Convex
  const event = await convexClient.query(api.events.getForAdmin, {
    id: params.id as Id<"events">,
    email: session.user.email,
  });

  if (!event) notFound();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
        <Link href="/events" className="hover:text-[#7A3A50] dark:hover:text-[#C48B90]">Événements</Link>
        <span>/</span>
        <Link href={`/events/${event._id}`} className="hover:text-[#7A3A50] dark:hover:text-[#C48B90]">{event.title}</Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300">Scanner</span>
      </div>

      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📱 Scanner QR Code</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Scannez les QR codes à l&apos;entrée pour valider les invitations
        </p>
      </div>

      {/* Scanner */}
      <QRScanner eventId={event._id} />
    </div>
  );
}
