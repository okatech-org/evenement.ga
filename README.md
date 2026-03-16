# EventFlow — Plateforme Modulaire de Gestion d'Événements

Créez des cartes d'invitation vivantes, immersives et mémorables.

## Stack Technique

- **Frontend** : Next.js 14 (App Router) + TypeScript
- **Styling** : Tailwind CSS + Shadcn/ui
- **Base de données** : PostgreSQL + Prisma ORM
- **Authentification** : NextAuth.js v5
- **Validation** : Zod
- **E-mails** : Resend + React Email
- **QR Code** : jose (JWT) + qrcode
- **Temps réel** : Pusher
- **Stockage** : AWS S3 / Cloudflare R2

## Installation

### Prérequis

- Node.js 20+
- PostgreSQL (local ou hébergé)
- npm

### Setup

```bash
# Cloner le projet
git clone <repo-url>
cd evenement.ga

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env.local
# → Éditer .env.local avec vos clés

# Initialiser la base de données
npx prisma migrate dev --name init

# (Optionnel) Peupler avec des données de test
npx prisma db seed

# Lancer le serveur de développement
npm run dev
```

L'application sera disponible sur `http://localhost:3000`.

## Structure du Projet

```
app/
├── (admin)/          ← Interface organisateur (auth guard)
│   ├── dashboard/    ← Tableau de bord
│   ├── events/       ← Gestion événements
│   └── layout.tsx    ← Layout admin (header, nav)
├── (public)/         ← Pages invités (layout isolé)
│   ├── [slug]/       ← Carte d'invitation
│   └── layout.tsx    ← Layout VIDE (aucun branding EventFlow)
├── api/              ← API REST
├── globals.css       ← Styles globaux
├── layout.tsx        ← Root layout
└── page.tsx          ← Landing page

components/
├── admin/            ← Composants dashboard
├── public/           ← Composants carte invitation
├── effects/          ← Effets visuels
└── ui/               ← Shadcn components

lib/
├── db.ts             ← Client Prisma singleton
├── auth.ts           ← Config NextAuth
├── config.ts         ← Constantes (types, modules, plans, effets)
├── utils.ts          ← Utilitaires (slugify, cn, formatDate)
└── validations/      ← Schémas Zod

prisma/
└── schema.prisma     ← Modèle de données (10 entités)

types/
└── index.ts          ← Types TypeScript

hooks/
├── use-auth.ts       ← Hook authentification
└── use-events.ts     ← Hook données événements
```

## Variables d'Environnement

Voir `.env.example` pour la liste complète.

## Commandes Disponibles

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run start        # Serveur de production
npm run lint         # ESLint
npx prisma studio    # Interface visuelle base de données
npx prisma migrate   # Migrations
```

## Licence

Confidentiel — Usage interne uniquement.
