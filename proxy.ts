/**
 * Proxy Next.js (anciennement "middleware") — délègue le contrôle
 * d'accès à Auth.js v5 via le callback `authorized` défini dans
 * `lib/auth/auth.ts`.
 *
 * Next.js 16 a renommé `middleware` → `proxy` (cf. proxy.md dans
 * la doc node_modules/next).
 *
 * Le matcher exclut tous les assets statiques pour éviter de payer un
 * round-trip d'auth sur chaque image / police / chunk JS.
 */

export { auth as proxy } from "@/lib/auth/auth";

export const config = {
  matcher: [
    /*
     * Match toutes les routes SAUF :
     *   - api/auth (handlers Auth.js)
     *   - _next/static (assets static générés)
     *   - _next/image (image optimization)
     *   - favicon.ico, robots.txt, sitemap.xml
     *   - sw.js, manifest.json (PWA)
     *   - .png, .ico, .svg, .woff, .woff2 (assets divers)
     */
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|sw\\.js|manifest\\.json|.*\\.(?:png|ico|svg|woff2?|webp|jpg|jpeg)$).*)",
  ],
};
