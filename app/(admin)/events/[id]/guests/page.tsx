import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { GUEST_STATUS_LABELS } from "@/lib/config";
import { GuestTable } from "@/components/admin/guest-table";
import type { GuestStatus } from "@prisma/client";

export default async function EventGuestsPage({
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

  const guests = await prisma.guest.findMany({
    where: { eventId: event.id },
    include: {
      rsvp: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Stats
  const statusCounts = {
    total: guests.length,
    confirmed: guests.filter((g) => g.status === "CONFIRMED").length,
    declined: guests.filter((g) => g.status === "DECLINED").length,
    pending: guests.filter((g) => g.status === "INVITED" || g.status === "SEEN").length,
    totalAdults: guests.reduce((acc, g) => acc + (g.rsvp?.adultCount || 0), 0),
    totalChildren: guests.reduce((acc, g) => acc + (g.rsvp?.childrenCount || 0), 0),
  };

  const statusColor: Record<GuestStatus, string> = {
    INVITED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    SEEN: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    CONFIRMED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    DECLINED: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    ABSENT: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
        <Link href="/events" className="hover:text-[#7A3A50] dark:hover:text-[#C48B90]">Événements</Link>
        <span>/</span>
        <Link href={`/events/${event.id}`} className="hover:text-[#7A3A50] dark:hover:text-[#C48B90]">{event.title}</Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300">Invités</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">👥 Gestion des invités</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {statusCounts.total} invité{statusCounts.total !== 1 ? "s" : ""} · Ajoutez des invités et envoyez-leur un lien personnalisé
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total", value: statusCounts.total, icon: "👥", color: "bg-gray-50 dark:bg-gray-800" },
          { label: "Confirmés", value: statusCounts.confirmed, icon: "✅", color: "bg-green-50 dark:bg-green-900/20" },
          { label: "Déclinés", value: statusCounts.declined, icon: "❌", color: "bg-red-50 dark:bg-red-900/20" },
          { label: "En attente", value: statusCounts.pending, icon: "⏳", color: "bg-amber-50 dark:bg-amber-900/20" },
          { label: "Adultes", value: statusCounts.totalAdults, icon: "🧑", color: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Enfants", value: statusCounts.totalChildren, icon: "👶", color: "bg-purple-50 dark:bg-purple-900/20" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl ${stat.color} p-4 shadow-sm`}>
            <div className="flex items-center justify-between">
              <span>{stat.icon}</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</span>
            </div>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Guest Table */}
      <GuestTable
        eventId={event.id}
        eventSlug={event.slug}
        guests={guests.map((g) => ({
          id: g.id,
          firstName: g.firstName,
          lastName: g.lastName,
          email: g.email || "",
          phone: g.phone,
          status: g.status,
          statusLabel: GUEST_STATUS_LABELS[g.status as keyof typeof GUEST_STATUS_LABELS]?.label || g.status,
          statusColor: statusColor[g.status],
          inviteToken: g.inviteToken,
          presence: g.rsvp?.presence ?? null,
          adultCount: g.rsvp?.adultCount ?? 0,
          childrenCount: g.rsvp?.childrenCount ?? 0,
          menuChoice: g.rsvp?.menuChoice ?? null,
          allergies: g.rsvp?.allergies ?? [],
          message: g.rsvp?.message ?? null,
        }))}
      />
    </div>
  );
}
