/**
 * Public event page placeholder
 * Will be replaced in Phase 4 with the full invitation card
 */
export default function EventPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Événement : {params.slug}</h1>
        <p className="mt-2 text-gray-500">
          La carte d&apos;invitation sera disponible bientôt.
        </p>
      </div>
    </div>
  );
}
