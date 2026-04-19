// noinspection ALL
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";

// Charte "Cité de la Démocratie" — Geist Sans + Geist Mono via package `geist`
// Les variables CSS sont --font-geist-sans et --font-geist-mono (consommées par tailwind.config).
const geistSans = GeistSans;
const geistMono = GeistMono;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#88734C",
};

export const metadata: Metadata = {
  title: {
    template: "%s | EventFlow",
    default: "EventFlow — Créez des invitations mémorables",
  },
  description:
    "Plateforme modulaire de gestion d'événements. Créez des cartes d'invitation vivantes et immersives pour vos mariages, anniversaires, baptêmes et plus.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"
  ),
  icons: {
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="manifest" href="/manifest.json" />
        {/* Empeche le navigateur de cacher le HTML — evite les hashes CSS/JS obsoletes apres redeploy */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider>
          <I18nProvider>
            <ConvexClientProvider>
              <AuthProvider>{children}</AuthProvider>
            </ConvexClientProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

