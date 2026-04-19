import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ThemeEditor } from "@/components/admin/theme-editor";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export default async function EventThemePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  // Migré Prisma → Convex (getForAdmin retourne event + theme)
  const event = await convexClient.query(api.events.getForAdmin, {
    id: params.id as Id<"events">,
    email: session.user.email,
  });

  if (!event) notFound();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/events" className="hover:text-[#88734C]">Événements</Link>
        <span>/</span>
        <Link href={`/events/${event._id}`} className="hover:text-[#88734C]">{event.title}</Link>
        <span>/</span>
        <span className="text-gray-700">Thème</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎨 Personnaliser le thème</h1>
          <p className="mt-1 text-sm text-gray-500">
            Couleurs, polices et effets visuels de votre invitation
          </p>
        </div>
        <Link
          href={`/${event.slug}`}
          target="_blank"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          Prévisualiser →
        </Link>
      </div>

      <ThemeEditor
        eventId={event._id}
        currentTheme={{
          preset: event.theme?.preset || "mariage",
          colorPrimary: event.theme?.colorPrimary,
          colorSecondary: event.theme?.colorSecondary,
          colorAccent: event.theme?.colorAccent,
          colorBackground: event.theme?.colorBackground,
          colorText: event.theme?.colorText,
          colorSurface: event.theme?.colorSurface,
          colorMuted: event.theme?.colorMuted,
          colorBorder: event.theme?.colorBorder,
          fontDisplay: event.theme?.fontDisplay,
          fontBody: event.theme?.fontBody,
          entryEffect: event.theme?.entryEffect,
          ambientEffect: event.theme?.ambientEffect,
          ambientIntensity: event.theme?.ambientIntensity,
          scrollReveal: event.theme?.scrollReveal,
          cursorEffect: event.theme?.cursorEffect,
          fontSizeTitle: event.theme?.fontSizeTitle ?? null,
          fontSizeBody: event.theme?.fontSizeBody ?? null,
          letterSpacing: event.theme?.letterSpacing ?? null,
          lineHeight: event.theme?.lineHeight ?? null,
        }}
        eventType={event.type}
      />
    </div>
  );
}
