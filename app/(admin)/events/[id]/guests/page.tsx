import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { GUEST_STATUS_LABELS } from "@/lib/config";
import { GuestTable } from "@/components/admin/guest-table";
import type { GuestStatus } from "@/lib/types";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const event = await convexClient.query(api.events.getById, {
    id: params.id as Id<"events">,
  });
  return { title: event ? `Invités — ${event.title} | EventFlow` : "Invités | EventFlow" };
}

export default async function EventGuestsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  // Migré Prisma → Convex : getForAdmin valide l'ownership par email.
  const event = await convexClient.query(api.events.getForAdmin, {
    id: params.id as Id<"events">,
    email: session.user.email,
  });

  if (!event) notFound();

  // Récupérer invités avec RSVP associé (rsvp.listGuests existe déjà)
  const guests = await convexClient.query(api.rsvp.listGuests, {
    eventId: event._id,
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
    <div className="flex flex-col h-full gap-3 lg:gap-4 overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 shrink-0">
        <Link href="/events" className="hover:text-[#7A3A50] dark:hover:text-[#C48B90]">Événements</Link>
        <span>/</span>
        <Link href={`/events/${event._id}`} className="hover:text-[#7A3A50] dark:hover:text-[#C48B90]">{event.title}</Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300">Invités</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-white">👥 Gestion des invités</h1>
          <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
            {statusCounts.total} invité{statusCounts.total !== 1 ? "s" : ""} · Ajoutez des invités et envoyez-leur un lien personnalisé
          </p>
        </div>
      </div>

      {/* Stats — compact */}
      <div className="grid gap-2 lg:gap-3 grid-cols-3 lg:grid-cols-6 shrink-0">
        {[
          { label: "Total", value: statusCounts.total, icon: "👥", color: "bg-gray-50 dark:bg-gray-800" },
          { label: "Confirmés", value: statusCounts.confirmed, icon: "✅", color: "bg-green-50 dark:bg-green-900/20" },
          { label: "Déclinés", value: statusCounts.declined, icon: "❌", color: "bg-red-50 dark:bg-red-900/20" },
          { label: "En attente", value: statusCounts.pending, icon: "⏳", color: "bg-amber-50 dark:bg-amber-900/20" },
          { label: "Adultes", value: statusCounts.totalAdults, icon: "🧑", color: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Enfants", value: statusCounts.totalChildren, icon: "👶", color: "bg-purple-50 dark:bg-purple-900/20" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl ${stat.color} p-2.5 lg:p-3 shadow-sm`}>
            <div className="flex items-center justify-between">
              <span className="text-sm">{stat.icon}</span>
              <span className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white">{stat.value}</span>
            </div>
            <p className="mt-0.5 text-[10px] lg:text-xs text-gray-600 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Guest Table */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <GuestTable
          eventId={event._id}
          eventSlug={event.slug}
          guests={guests.map((g) => ({
            id: g._id,
            firstName: g.firstName,
            lastName: g.lastName,
            email: g.email || "",
            phone: g.phone ?? null,
            status: g.status,
            statusLabel: GUEST_STATUS_LABELS[g.status as keyof typeof GUEST_STATUS_LABELS]?.label || g.status,
            statusColor: statusColor[g.status as GuestStatus],
            inviteToken: g.inviteToken ?? null,
            presence: g.rsvp?.presence ?? null,
            adultCount: g.rsvp?.adultCount ?? 0,
            childrenCount: g.rsvp?.childrenCount ?? 0,
            menuChoice: g.rsvp?.menuChoice ?? null,
            allergies: g.rsvp?.allergies ?? [],
            message: g.rsvp?.message ?? null,
          }))}
        />
      </div>
    </div>
  );
}
