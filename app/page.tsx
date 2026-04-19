import Link from "next/link";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F2F2EB] via-white to-[#F2F2EB]">
      {/* Header */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#88734C] to-[#b59e5e]">
            <span className="text-lg font-bold text-white">E</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">
            Event<span className="text-[#88734C]">Flow</span>
          </span>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <a href="#features" className="transition hover:text-[#88734C]">
            Fonctionnalités
          </a>
          <a href="#pricing" className="transition hover:text-[#88734C]">
            Tarifs
          </a>
          <Link
            href="/login"
            className="transition hover:text-[#88734C]"
          >
            Connexion
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-[#88734C] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#88734C]/25 transition hover:bg-[#6b5a3a] hover:shadow-xl"
          >
            Créer un événement
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-16 text-center md:pt-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#88734C]/10 px-4 py-1.5 text-sm font-medium text-[#88734C]">
            <span className="inline-block h-2 w-2 rounded-full bg-[#88734C] animate-pulse" />
            Nouveau — Cartes d&apos;invitation vivantes
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 md:text-6xl">
            Chaque événement mérite
            <br />
            <span className="bg-gradient-to-r from-[#88734C] via-[#b59e5e] to-[#b59e5e] bg-clip-text text-transparent">
              une invitation unique
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-500 md:text-xl">
            Créez des cartes d&apos;invitation immersives et mémorables.
            RSVP, QR codes, chat en temps réel — tout en un seul lien.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="rounded-full bg-[#88734C] px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-[#88734C]/30 transition-all hover:bg-[#6b5a3a] hover:shadow-2xl hover:scale-[1.02]"
            >
              Commencer gratuitement
            </Link>
            {!IS_PRODUCTION && (
              <Link
                href="/demo"
                className="group flex items-center gap-2 rounded-full border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition-all hover:border-[#88734C]/30 hover:shadow-md"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#88734C]/10 text-[#88734C] transition group-hover:bg-[#88734C] group-hover:text-white">
                  ▶
                </span>
                Voir la démo
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="mx-auto max-w-7xl px-6 pb-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Tout ce dont vous avez besoin
          </h2>
          <p className="mt-3 text-gray-500">
            Des modules puissants, activés en un clic.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "💌",
              title: "Invitations Immersives",
              desc: "Pages d'invitation vivantes avec effets visuels adaptés à votre événement.",
            },
            {
              icon: "✅",
              title: "RSVP Intelligent",
              desc: "Formulaire multi-étapes, gestion des menus, allergies et accompagnants.",
            },
            {
              icon: "📱",
              title: "QR Code & Scan",
              desc: "QR code unique par invité. Scannez à l'entrée, même hors-ligne.",
            },
            {
              icon: "📊",
              title: "Dashboard Temps Réel",
              desc: "Suivez les confirmations, menus et présences en un coup d'œil.",
            },
            {
              icon: "💬",
              title: "Chat Interne",
              desc: "Communication en temps réel entre organisateurs et invités.",
            },
            {
              icon: "🎨",
              title: "Thèmes Sur Mesure",
              desc: "6 presets immersifs + personnalisation complète des couleurs et effets.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-[#88734C]/20 hover:shadow-lg hover:-translate-y-1"
            >
              <span className="text-3xl">{feature.icon}</span>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white px-6 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-sm text-gray-400">
          <span>© 2026 EventFlow. Tous droits réservés.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-gray-600">
              Mentions légales
            </a>
            <a href="#" className="hover:text-gray-600">
              Confidentialité
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
