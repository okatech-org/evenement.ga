import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { EventSettingsClient } from "@/components/admin/event-settings-client";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export default async function EventSettingsPage({
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
    <EventSettingsClient
      event={{
        id: event._id,
        title: event.title,
        slug: event.slug,
        type: event.type,
        visibility: event.visibility,
        password: event.password ?? null,
      }}
    />
  );
}
