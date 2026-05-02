/**
 * Service worker minimal — installabilité PWA.
 *
 * Pour l'instant : aucune stratégie de cache active. L'objectif est juste
 * de satisfaire les critères installables des navigateurs (manifest +
 * SW enregistré + HTTPS). Le caching avancé (audio, sourates en cours,
 * fonts QPC, outbox de mutations) viendra dans une PR dédiée quand
 * Serwist aura un support stable de Turbopack ou qu'on basculera sur
 * @serwist/turbopack.
 *
 * Hooks de cycle de vie :
 *  - install : prend la main immédiatement, pas de cache pré-rempli
 *  - activate : revendique tous les clients (les pages déjà ouvertes
 *               sont contrôlées par ce SW dès l'activation)
 *  - fetch : pass-through, le navigateur reste maître du réseau
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Pas de handler fetch volontairement — le SW est inerte sur les requêtes
// pour l'instant. Ajout du caching dans une étape suivante.
