"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  label?: string;
  /**
   * Si fourni, joue uniquement ce verset puis s'arrête (pas d'auto-next).
   * Pour la lecture continue d'une leçon entière, utiliser plus tard
   * un parent qui orchestre les transitions ayah-par-ayah.
   */
  onEnded?: () => void;
};

/**
 * Lecteur audio minimaliste pour un verset.
 * - Play/Pause toggle
 * - "preload=none" pour économiser la bande passante (l'audio ne se charge
 *   qu'au premier clic, important sur mobile en data)
 * - Garde l'élément `<audio>` mounté pour pouvoir reprendre sans re-fetch
 */
export function AudioPlayer({ src, label, onEnded }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPauseEvt = () => setPlaying(false);
    const onLoadStart = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onEndedEvt = () => {
      setPlaying(false);
      onEnded?.();
    };
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPauseEvt);
    el.addEventListener("loadstart", onLoadStart);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("ended", onEndedEvt);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPauseEvt);
      el.removeEventListener("loadstart", onLoadStart);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("ended", onEndedEvt);
    };
  }, [onEnded]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={toggle}
        aria-label={playing ? "Mettre en pause" : "Écouter"}
        className={cn("h-8 px-2 text-muted-foreground hover:text-foreground")}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        {label ? <span className="ml-1 text-xs">{label}</span> : null}
        {loading ? <span className="ml-1 text-[10px] uppercase tracking-wider">…</span> : null}
      </Button>
      <audio ref={audioRef} src={src} preload="none" />
    </div>
  );
}
