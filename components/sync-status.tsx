"use client";

import { useEffect, useState } from "react";
import { CloudOff, Loader } from "lucide-react";
import { peekCount, startOutboxAutoFlush } from "@/lib/sync/outbox";
import { cn } from "@/lib/utils";

/**
 * Indicateur discret en bas à droite.
 *
 * Source de vérité : la taille de l'outbox des mutations à synchro.
 *
 *   - silencieux quand l'outbox est vide (cas nominal — 99% du temps)
 *   - 🔵 "X en attente" pendant que l'outbox draine
 *   - 🟠 "Hors ligne" SEULEMENT si on est sûr d'être déconnecté
 *     (navigator.onLine === false) ET qu'on a des mutations en attente
 *
 * On ne se fie PAS à `navigator.onLine` seul : ce signal est notoirement
 * peu fiable (Chrome sur Linux notamment renvoie souvent `false` à tort).
 * Le critère "vraiment hors ligne" combine les deux signaux.
 */
export function SyncStatus() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Initialisation après hydration (évite les hydration mismatches)
    setOnline(navigator.onLine);

    startOutboxAutoFlush(() => {
      void peekCount().then(setPending);
    });

    const onlineH = () => setOnline(true);
    const offlineH = () => setOnline(false);
    window.addEventListener("online", onlineH);
    window.addEventListener("offline", offlineH);

    void peekCount().then(setPending);

    const tick = setInterval(() => {
      void peekCount().then(setPending);
    }, 5000);

    return () => {
      window.removeEventListener("online", onlineH);
      window.removeEventListener("offline", offlineH);
      clearInterval(tick);
    };
  }, []);

  // Cas nominal : rien à signaler.
  if (pending === 0) return null;

  const reallyOffline = !online;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border bg-card/90 px-3 py-1.5 text-xs shadow-lg backdrop-blur",
        reallyOffline
          ? "border-amber-500/40 text-amber-700 dark:text-amber-300"
          : "border-border/60 text-muted-foreground",
      )}
    >
      {reallyOffline ? (
        <>
          <CloudOff className="size-3.5" />
          <span>
            Hors ligne — {pending} modification{pending > 1 ? "s" : ""} en attente
          </span>
        </>
      ) : (
        <>
          <Loader className="size-3.5 animate-spin" />
          <span>
            Synchronisation ({pending} en attente)
          </span>
        </>
      )}
    </div>
  );
}
