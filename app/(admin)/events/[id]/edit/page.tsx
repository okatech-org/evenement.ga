import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { EventEditClient } from "@/components/admin/event-edit-client";

export default async function EventEditPage({
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
      description: true,
      date: true,
      endDate: true,
      location: true,
      coverImage: true,
      coverVideo: true,
      type: true,
      modules: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!event) notFound();

  return (
    <EventEditClient
      event={{
        ...event,
        date: event.date.toISOString(),
        endDate: event.endDate?.toISOString() || null,
        modules: event.modules.map((m) => ({
          id: m.id,
          type: m.type,
          active: m.active,
          order: m.order,
          configJson: m.configJson as Record<string, unknown>,
        })),
      }}
    />
  );
}
