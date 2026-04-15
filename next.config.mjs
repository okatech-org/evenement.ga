/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Packages avec bindings natifs ou incompatibles avec le bundling webpack
  // doivent rester externes en mode standalone pour Docker/Cloud Run
  experimental: {
    serverComponentsExternalPackages: ["pg"],
  },

  // ─── Headers (Security + Cache) ───────────────────────────
  async headers() {
    return [
      // ── Assets statiques immutables (hash dans le nom de fichier) ──
      // Mis en cache agressivement pendant 1 an — chaque build a de nouveaux hashes
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/image/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // ── Pages HTML et routes API : JAMAIS de cache navigateur ──
      // Empeche les clients de recuperer un vieux HTML qui reference
      // des hashes CSS/JS qui n'existent plus sur Cloud Run apres un redeploy.
      {
        source: "/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, max-age=0",
          },
        ],
      },
      // ── Security headers (applique a toutes les routes) ──
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Enable XSS protection
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Control referrer information
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions policy (restrict browser features)
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Strict Transport Security (HTTPS only, 1 year)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
      // ── Content Security Policy (HTML routes seulement, ignore /api/auth) ──
      {
        source: "/((?!api/auth).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https://*.convex.cloud wss://*.convex.cloud; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com https://*.googleusercontent.com https://appleid.apple.com",
          },
        ],
      },
    ];
  },

  // ─── Powered-By Header (hide Next.js banner) ─────────────
  poweredByHeader: false,
};

export default nextConfig;
