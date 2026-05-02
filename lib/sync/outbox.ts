/**
 * Outbox IndexedDB pour les mutations.
 *
 * Modèle :
 *  - On essaye d'envoyer la mutation immédiatement.
 *  - Si réseau échoue (TypeError) ou status 5xx → on enqueue dans IndexedDB
 *    et on retournera la flusher au prochain événement `online`.
 *  - Si status 4xx (erreur côté client / business) → on **lève** une erreur
 *    et on ne réessaye pas (mutation invalide, pas un problème de réseau).
 *
 * iOS Safari : le `Background Sync API` n'est pas supporté, donc on flush
 * uniquement au foreground (sur l'événement `online` quand l'utilisateur
 * reprend l'app).
 */

import Dexie, { type Table } from "dexie";

export type Mutation = {
  url: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body: unknown;
};

type OutboxRow = Mutation & {
  id?: number;
  createdAt: number;
  retries: number;
};

class OutboxDB extends Dexie {
  items!: Table<OutboxRow, number>;

  constructor() {
    super("coran-outbox");
    this.version(1).stores({
      items: "++id, createdAt",
    });
  }
}

let _db: OutboxDB | null = null;

function db(): OutboxDB | null {
  if (typeof window === "undefined") return null;
  if (!_db) _db = new OutboxDB();
  return _db;
}

/**
 * Envoie la mutation immédiatement, ou l'enqueue si réseau indisponible.
 * Retourne la `Response` si le réseau a marché, `null` si la mutation a
 * été enqueue.
 *
 * @throws Si le serveur a renvoyé une erreur 4xx (= mutation invalide,
 * pas un problème réseau — l'utilisateur doit voir l'erreur).
 */
export async function sendOrEnqueue(m: Mutation): Promise<Response | null> {
  try {
    const res = await fetchMutation(m);
    if (res.ok) return res;

    if (res.status >= 400 && res.status < 500) {
      // Erreur métier : ne pas enqueue, lever pour que l'UI affiche le toast.
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error ?? `HTTP ${res.status}`);
    }

    // 5xx → erreur serveur, on enqueue et on retentera plus tard.
    await enqueue(m);
    return null;
  } catch (err) {
    // TypeError = échec réseau (offline, DNS, etc.). On enqueue.
    if (err instanceof TypeError) {
      await enqueue(m);
      return null;
    }
    throw err;
  }
}

async function enqueue(m: Mutation): Promise<void> {
  const handle = db();
  if (!handle) return; // SSR : pas d'outbox côté serveur, on no-op.
  await handle.items.add({
    ...m,
    createdAt: Date.now(),
    retries: 0,
  });
}

async function fetchMutation(m: Mutation): Promise<Response> {
  return fetch(m.url, {
    method: m.method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(m.body),
  });
}

export async function peekCount(): Promise<number> {
  const handle = db();
  if (!handle) return 0;
  return handle.items.count();
}

/**
 * Flush l'outbox : tente d'envoyer chaque item dans l'ordre chronologique.
 * Items 4xx-rejetés : supprimés (on perd la mutation, mais elle aurait
 * échoué de toute façon — log côté console pour debug).
 * Items qui passent : supprimés.
 * Items en échec réseau ou 5xx : on incrémente retries et on garde.
 */
export async function flush(): Promise<{ sent: number; dropped: number; pending: number }> {
  const handle = db();
  if (!handle) return { sent: 0, dropped: 0, pending: 0 };

  const items = await handle.items.orderBy("createdAt").toArray();
  let sent = 0;
  let dropped = 0;

  for (const item of items) {
    try {
      const res = await fetchMutation(item);
      if (res.ok) {
        await handle.items.delete(item.id!);
        sent++;
        continue;
      }
      if (res.status >= 400 && res.status < 500) {
        // Mutation invalide (probablement parce que l'état a évolué). On drop.
        const err = await res.json().catch(() => ({}));
        console.warn("[outbox] dropping mutation due to 4xx:", item, err);
        await handle.items.delete(item.id!);
        dropped++;
        continue;
      }
      // 5xx : on incrémente retries pour observabilité, on garde.
      await handle.items.update(item.id!, { retries: item.retries + 1 });
    } catch {
      // Réseau toujours down : on s'arrête là, on retentera plus tard.
      break;
    }
  }

  return { sent, dropped, pending: await handle.items.count() };
}

/**
 * Branche un listener qui flush l'outbox à chaque retour `online`.
 * À appeler une seule fois côté client (idempotent : on de-dupe via la
 * référence du listener).
 */
let onlineListenerRegistered = false;
export function startOutboxAutoFlush(onChange?: () => void) {
  if (typeof window === "undefined" || onlineListenerRegistered) return;
  onlineListenerRegistered = true;

  const handler = () => {
    void flush().then((r) => {
      if (r.sent > 0 || r.dropped > 0) onChange?.();
    });
  };

  window.addEventListener("online", handler);
  // Tentative initiale au mount (le browser peut déjà être online).
  if (navigator.onLine) handler();
}
