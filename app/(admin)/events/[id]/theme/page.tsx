import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ThemeEditor } from "@/components/admin/theme-editor";

export default async function EventThemePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const event = await prisma.event.findUnique({
    where: { id: params.id, userId: session.user.id },
    include: { theme: true },
  });

  if (!event) notFound();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/events" className="hover:text-[#7A3A50]">Événements</Link>
        <span>/</span>
        <Link href={`/events/${event.id}`} className="hover:text-[#7A3A50]">{event.title}</Link>
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
        eventId={event.id}
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
          fontSizeTitle: (event.theme as Record<string, unknown>)?.fontSizeTitle as string | null ?? null,
          fontSizeBody: (event.theme as Record<string, unknown>)?.fontSizeBody as string | null ?? null,
          letterSpacing: (event.theme as Record<string, unknown>)?.letterSpacing as string | null ?? null,
          lineHeight: (event.theme as Record<string, unknown>)?.lineHeight as string | null ?? null,
        }}
        eventType={event.type}
      />
    </div>
  );
}
