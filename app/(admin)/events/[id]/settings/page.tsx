import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { EventSettingsClient } from "@/components/admin/event-settings-client";

export const dynamic = "force-dynamic";

export default async function EventSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const event = await prisma.event.findUnique({
    where: { id: params.id, userId: session.user.id },
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      visibility: true,
      password: true,
    },
  });

  if (!event) notFound();

  return <EventSettingsClient event={event} />;
}
