import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | EventFlow",
    default: "EventFlow — Créez des invitations mémorables",
  },
  description:
    "Plateforme modulaire de gestion d'événements. Créez des cartes d'invitation vivantes et immersives pour vos mariages, anniversaires, baptêmes et plus.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7A3A50" />
        {/* Empeche le navigateur de cacher le HTML — evite les hashes CSS/JS obsoletes apres redeploy */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
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

