"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, Loader } from "lucide-react";
import { peekCount, startOutboxAutoFlush } from "@/lib/sync/outbox";
import { cn } from "@/lib/utils";

/**
 * Indicateur discret en bas à droite :
 *   - 🟢 silencieux quand tout est synchro et en ligne
 *   - 🟠 "Hors ligne" quand pas de réseau
 *   - 🔵 "X modification(s) à synchroniser" quand l'outbox est non vide
 */
export function SyncStatus() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    startOutboxAutoFlush(() => {
      void peekCount().then(setPending);
    });

    const onlineH = () => setOnline(true);
    const offlineH = () => setOnline(false);
    window.addEventListener("online", onlineH);
    window.addEventListener("offline", offlineH);

    void peekCount().then(setPending);

    // Re-pull pending count périodiquement (très léger)
    const tick = setInterval(() => {
      void peekCount().then(setPending);
    }, 5000);

    return () => {
      window.removeEventListener("online", onlineH);
      window.removeEventListener("offline", offlineH);
      clearInterval(tick);
    };
  }, []);

  // Rien à afficher quand tout va bien et qu'on est en ligne
  if (online && pending === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border bg-card/90 px-3 py-1.5 text-xs shadow-lg backdrop-blur",
        !online ? "border-amber-500/40 text-amber-700 dark:text-amber-300" : "border-border/60 text-muted-foreground",
      )}
    >
      {!online ? (
        <>
          <CloudOff className="size-3.5" />
          <span>Hors ligne — tes modifications seront synchronisées plus tard</span>
        </>
      ) : pending > 0 ? (
        <>
          <Loader className="size-3.5 animate-spin" />
          <span>
            Synchronisation ({pending} en attente)
          </span>
        </>
      ) : (
        <>
          <Cloud className="size-3.5" />
          <span>Synchronisé</span>
        </>
      )}
    </div>
  );
}
