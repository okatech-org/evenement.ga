import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { QRScanner } from "@/components/admin/qr-scanner";

export const dynamic = "force-dynamic";

export default async function EventScannerPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const event = await prisma.event.findUnique({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, title: true, slug: true },
  });

  if (!event) notFound();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
        <Link href="/events" className="hover:text-[#7A3A50] dark:hover:text-[#C48B90]">Événements</Link>
        <span>/</span>
        <Link href={`/events/${event.id}`} className="hover:text-[#7A3A50] dark:hover:text-[#C48B90]">{event.title}</Link>
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
      <QRScanner eventId={event.id} />
    </div>
  );
}
