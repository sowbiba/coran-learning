"use client";

import { useEffect } from "react";

/**
 * - Enregistre le service worker `/sw.js` (rend l'app installable PWA).
 * - Demande la persistance du stockage (sinon iOS purge IndexedDB et
 *   CacheStorage après 14 jours d'inactivité, perdant l'outbox de
 *   mutations et les enregistrements vocaux locaux).
 *
 * Tout s'exécute uniquement en navigateur, après hydration.
 */
export function PWAClient() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Pas critique si l'enregistrement échoue (mode dev, conditions
        // réseau, etc.) — l'app continue de fonctionner sans SW.
      });
    }

    if ("storage" in navigator && "persist" in navigator.storage) {
      void navigator.storage.persist();
    }
  }, []);

  return null;
}
