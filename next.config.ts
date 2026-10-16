import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// En-têtes de sécurité (audit de sécurité du 12 octobre 2026, constat 7)
// ---------------------------------------------------------------------------
// Politique de contenu (CSP) : liste ce que le site a le droit de charger. Toute autre source
// (script injecté, image ou formulaire vers un autre site…) est signalée, puis bloquée une fois activée.
// Pour l'instant en mode « rapport seulement » : rien n'est bloqué, les écarts sont notés dans les
// journaux Vercel (route /api/csp-report). Après une à deux semaines sans alerte, passer à true.
const CSP_ENFORCE = false;

const supabase = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin; } catch { return ""; }
})();
const supabaseWs = supabase.replace(/^http/, "ws");

const csp = [
  "default-src 'self'",
  // Next.js insère des scripts dans la page ; jsDelivr sert l'outil de compression des photos (browser-image-compression)
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${supabase} https://images.unsplash.com https://images.pexels.com`,
  `media-src 'self' blob: ${supabase} https://cdn.pixabay.com https://upload.wikimedia.org`,
  `connect-src 'self' ${supabase} ${supabaseWs} https://cdn.jsdelivr.net https://challenges.cloudflare.com`,
  // Le Studio affiche un aperçu de l'invitation du site dans un cadre : seulement depuis le site lui-même
  "frame-src 'self' https://challenges.cloudflare.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "report-uri /api/csp-report",
  "report-to csp",
].join("; ");

const securityHeaders = [
  { key: CSP_ENFORCE ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value: csp },
  { key: "Reporting-Endpoints", value: 'csp="/api/csp-report"' },
  // Aucune page du site ne s'affiche dans le cadre d'un AUTRE site (anti « clickjacking ») ; l'aperçu du Studio reste permis
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Le site n'utilise ni caméra, ni micro, ni géolocalisation, ni paiement intégré au navigateur
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Guide d'utilisation : page statique (public/guide/index.html) servie sur /guide
  async rewrites() {
    return [{ source: "/guide", destination: "/guide/index.html" }];
  },
  async redirects() {
    return [
      // Liens RSVP déjà envoyés par WhatsApp : la page publique a quitté l'espace des mariés
      { source: "/dashboard/rsvp/:id", destination: "/rsvp/:id", permanent: true },
      // Anciennes pages en double
      { source: "/dashboard/guests", destination: "/dashboard/invite", permanent: true },
      { source: "/dashboard/tables", destination: "/dashboard/table", permanent: true },
      { source: "/dashboard/invitation", destination: "/dashboard/studio", permanent: true },
      // Anciens liens des documents juridiques
      { source: "/terms", destination: "/conditions", permanent: true },
      { source: "/privacy", destination: "/confidentialite", permanent: true },
      // Ancienne galerie à mot de passe, remplacée par l'Album photos de chaque couple
      { source: "/galerie", destination: "/dashboard/album", permanent: true },
    ];
  },
};

export default nextConfig;
