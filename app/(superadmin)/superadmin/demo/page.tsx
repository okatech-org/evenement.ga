import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import { DEMO_ACCOUNTS } from "@/lib/demo-guard";
import { DemoManagement } from "./demo-management";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Comptes Démo — Super Admin" };

export default async function SuperAdminDemoPage() {
  // Get demo users from DB
  const demoUsers = await prisma.user.findMany({
    where: { isDemoAccount: true },
    include: {
      _count: { select: { events: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Get demo events stats
  const demoEvents = await prisma.event.findMany({
    where: { slug: { startsWith: "demo-" } },
    include: {
      _count: { select: { guests: true } },
    },
  });

  const userData = demoUsers.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    plan: u.plan,
    demoAccountType: u.demoAccountType,
    eventCount: u._count.events,
    createdAt: u.createdAt.toISOString(),
  }));

  const eventData = demoEvents.map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    type: e.type,
    guestCount: e._count.guests,
    status: e.status,
  }));

  const accountsArray = Object.entries(DEMO_ACCOUNTS).map(([key, val]) => ({
    key,
    label: val.label,
    icon: val.icon,
    email: val.email,
    plan: val.plan as string,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Comptes Démo</h1>
        <p className="mt-1 text-sm text-[#8B949E]">
          Gestion des comptes et événements de démonstration
        </p>
      </div>

      <DemoManagement
        users={userData}
        events={eventData}
        accounts={accountsArray}
      />
    </div>
  );
}
