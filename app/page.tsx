import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFDF9] via-white to-[#FFF0F3]">
      {/* Header */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7A3A50] to-[#C48B90]">
            <span className="text-lg font-bold text-white">E</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">
            Event<span className="text-[#7A3A50]">Flow</span>
          </span>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <a href="#features" className="transition hover:text-[#7A3A50]">
            Fonctionnalités
          </a>
          <a href="#pricing" className="transition hover:text-[#7A3A50]">
            Tarifs
          </a>
          <Link
            href="/login"
            className="transition hover:text-[#7A3A50]"
          >
            Connexion
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-[#7A3A50] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7A3A50]/25 transition hover:bg-[#6A2A40] hover:shadow-xl"
          >
            Créer un événement
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-16 text-center md:pt-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#7A3A50]/10 px-4 py-1.5 text-sm font-medium text-[#7A3A50]">
            <span className="inline-block h-2 w-2 rounded-full bg-[#7A3A50] animate-pulse" />
            Nouveau — Cartes d&apos;invitation vivantes
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 md:text-6xl">
            Chaque événement mérite
            <br />
            <span className="bg-gradient-to-r from-[#7A3A50] via-[#C48B90] to-[#C9A96E] bg-clip-text text-transparent">
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
              className="rounded-full bg-[#7A3A50] px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-[#7A3A50]/30 transition-all hover:bg-[#6A2A40] hover:shadow-2xl hover:scale-[1.02]"
            >
              Commencer gratuitement
            </Link>
            <a
              href="#demo"
              className="group flex items-center gap-2 rounded-full border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition-all hover:border-[#7A3A50]/30 hover:shadow-md"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7A3A50]/10 text-[#7A3A50] transition group-hover:bg-[#7A3A50] group-hover:text-white">
                ▶
              </span>
              Voir la démo
            </a>
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
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-[#7A3A50]/20 hover:shadow-lg hover:-translate-y-1"
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
