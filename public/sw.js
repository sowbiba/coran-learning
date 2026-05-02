/**
 * Service worker — installabilité PWA + cache audio offline.
 *
 * Stratégie :
 *  - install/activate : skip waiting + clients.claim (mise à jour
 *    immédiate, pas de stale window)
 *  - fetch sur audio everyayah.com : CacheFirst avec stockage dans
 *    le cache `coran-audio-v1`. Les fichiers audio par verset
 *    (~30-100 KB chacun) restent en cache une fois écoutés ; offline
 *    rejoue depuis le cache.
 *  - fetch sur tout le reste : pass-through (le navigateur reste maître)
 *
 * Note iOS Safari : la spec dit que les Range requests sur les `Response`
 * mises en cache via `cache.put` sont rejetées. On utilise donc
 * `<audio preload="none">` côté UI : pas de demande de Range, lecture
 * en streaming complet du fichier, ce qui passe à travers le cache.
 *
 * Pas d'éviction LRU pour l'instant. Le navigateur évincera la cache
 * lui-même si l'espace disque devient critique. Pour un usage perso
 * sur quelques centaines de versets cumulés, on est largement sous le
 * quota par origine.
 */

const AUDIO_CACHE = "coran-audio-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.hostname === "everyayah.com" && url.pathname.endsWith(".mp3")) {
    event.respondWith(handleAudio(req));
  }
});

async function handleAudio(req) {
  const cache = await caches.open(AUDIO_CACHE);

  const cached = await cache.match(req, { ignoreVary: true });
  if (cached) return cached;

  try {
    const res = await fetch(req);
    if (res && res.ok) {
      // res.clone() avant de la consommer — body n'est lisible qu'une fois.
      cache.put(req, res.clone()).catch((err) => {
        console.warn("[sw] cache.put failed:", err);
      });
    }
    return res;
  } catch (err) {
    // Hors ligne et pas en cache : retourne 503 explicite plutôt que de
    // laisser le navigateur tomber en erreur réseau silencieuse.
    return new Response("Audio non disponible hors ligne (jamais écouté).", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}
