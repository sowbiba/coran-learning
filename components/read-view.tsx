"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipForward, Square } from "lucide-react";
import { BismillahHeader } from "@/components/bismillah-header";
import { NoteEditor } from "@/components/note-editor";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ChunkAyah } from "@/lib/content/quran";

type Props = {
  ayahs: ChunkAyah[];
  surahNameTranslit: string;
  bismillah: string | null;
};

/**
 * Vue "Lire la leçon".
 *
 * Tout est visible (arabe + translit + traduction + note + audio par verset),
 * sans étapes ni rating.
 *
 * Lecture audio :
 *  - Un seul élément <audio> partagé pour toute la vue.
 *  - "Tout écouter" : enchaîne les versets l'un après l'autre.
 *  - Bouton ▶ par verset : lit ce verset puis passe au suivant
 *    (sequential depuis ce verset).
 *  - "Stop" : arrête et désélectionne.
 *
 * Le verset en cours de lecture est mis en évidence (background subtil).
 */
export function ReadView({ ayahs, surahNameTranslit, bismillah }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  /** Index 1-based du mot du verset en cours, ou 0 si avant le 1er mot. */
  const [currentWord, setCurrentWord] = useState(0);

  // Scroll auto vers le verset en cours de lecture
  useEffect(() => {
    if (playingIdx === null) return;
    const el = itemRefs.current[playingIdx];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [playingIdx]);

  // Surbrillance mot-à-mot — pendant la lecture, on retrouve le segment
  // dont [startMs, endMs] englobe audio.currentTime.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || playingIdx === null) {
      setCurrentWord(0);
      return;
    }
    const segments = ayahs[playingIdx]?.segments;
    if (!segments || segments.length === 0) {
      setCurrentWord(0);
      return;
    }
    function onTimeUpdate() {
      if (!audio) return;
      const ms = audio.currentTime * 1000;
      // Recherche linéaire — au plus quelques dizaines de mots par verset.
      let found = 0;
      for (const [wIdx, start, end] of segments!) {
        if (ms >= start && ms < end) {
          found = wIdx;
          break;
        }
        if (ms >= end) found = wIdx;
      }
      setCurrentWord(found);
    }
    onTimeUpdate();
    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => audio.removeEventListener("timeupdate", onTimeUpdate);
  }, [playingIdx, ayahs]);

  // Quand playingIdx change, charge et joue l'audio du verset à cet index
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingIdx === null) {
      audio.pause();
      return;
    }
    const url = ayahs[playingIdx]?.audioUrl;
    if (!url) {
      // Skip vers le suivant si pas d'URL audio
      setPlayingIdx(playingIdx + 1 < ayahs.length ? playingIdx + 1 : null);
      return;
    }
    audio.src = url;
    audio.play().catch(() => {
      // Autoplay bloqué (ex. iOS Safari sans interaction). On stoppe.
      setPlayingIdx(null);
    });
    setPaused(false);
  }, [playingIdx, ayahs]);

  function handleEnded() {
    if (playingIdx === null) return;
    if (playingIdx + 1 < ayahs.length) {
      setPlayingIdx(playingIdx + 1);
    } else {
      setPlayingIdx(null);
    }
  }

  function playAll() {
    setPlayingIdx(0);
  }

  function playFrom(idx: number) {
    setPlayingIdx(idx);
  }

  function togglePause() {
    const audio = audioRef.current;
    if (!audio || playingIdx === null) return;
    if (audio.paused) {
      void audio.play();
      setPaused(false);
    } else {
      audio.pause();
      setPaused(true);
    }
  }

  function stop() {
    setPlayingIdx(null);
    setPaused(false);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  function skipNext() {
    if (playingIdx === null) return;
    if (playingIdx + 1 < ayahs.length) {
      setPlayingIdx(playingIdx + 1);
    } else {
      stop();
    }
  }

  const isPlaying = playingIdx !== null;

  return (
    <div className="space-y-6">
      <audio ref={audioRef} onEnded={handleEnded} preload="none" />

      {bismillah ? <BismillahHeader text={bismillah} /> : null}

      {/* Barre de contrôle audio sticky au-dessus de la liste */}
      <div className="sticky top-2 z-10 flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex items-center gap-1">
          {!isPlaying ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={playAll}
              aria-label="Tout écouter"
            >
              <Play className="me-1 size-4" />
              Tout écouter
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={togglePause}
                aria-label={paused ? "Reprendre" : "Mettre en pause"}
              >
                {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={skipNext}
                aria-label="Verset suivant"
              >
                <SkipForward className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={stop}
                aria-label="Arrêter la lecture"
              >
                <Square className="size-4" />
              </Button>
            </>
          )}
        </div>
        {isPlaying ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            Verset {ayahs[playingIdx]?.numberInSurah} / {ayahs.length}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{ayahs.length} versets</span>
        )}
      </div>

      <ol className="divide-y divide-border/40">
        {ayahs.map((ayah, idx) => {
          const isCurrent = idx === playingIdx;
          const words = ayah.textUthmani.trim().split(/\s+/);
          return (
            <li
              key={ayah.id}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              className={cn(
                "space-y-3 py-6 first:pt-0 last:pb-0 transition-colors",
                isCurrent && "rounded-md bg-foreground/[0.03] px-3 ring-1 ring-foreground/10",
              )}
            >
              <header className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Verset {ayah.numberInSurah}
                </span>
                <div className="flex items-center gap-1">
                  <NoteEditor
                    ayahId={ayah.id}
                    ayahNumberInSurah={ayah.numberInSurah}
                    surahNameTranslit={surahNameTranslit}
                    initialBody={ayah.noteBodyMd ?? ""}
                  />
                  {ayah.audioUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => playFrom(idx)}
                      aria-label={`Écouter à partir du verset ${ayah.numberInSurah}`}
                      className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    >
                      <Play className="size-4" />
                      <span className="ml-1 text-xs">Lire à partir d'ici</span>
                    </Button>
                  ) : null}
                </div>
              </header>

              <p
                lang="ar"
                dir="rtl"
                className="arabic text-balance text-3xl leading-[2.4] text-foreground"
              >
                {words.map((word, wIdx) => {
                  const isActiveWord = isCurrent && wIdx + 1 === currentWord;
                  return (
                    <span
                      key={wIdx}
                      className={cn(
                        "transition-colors",
                        isActiveWord &&
                          "rounded bg-foreground/10 px-1 text-foreground",
                      )}
                    >
                      {word}
                      {wIdx < words.length - 1 ? " " : ""}
                    </span>
                  );
                })}
              </p>

              {ayah.transliteration && ayah.transliteration.length > 0 ? (
                <p className="translit text-sm">
                  {ayah.transliteration.map((w, i) => (
                    <span key={i} className="me-2 inline-block">
                      {w.latin}
                    </span>
                  ))}
                </p>
              ) : null}

              {ayah.textFr ? (
                <p className="text-base leading-relaxed text-foreground/80">{ayah.textFr}</p>
              ) : null}

              {ayah.noteBodyMd ? (
                <blockquote className="mt-2 border-s-2 border-foreground/30 ps-3 text-sm text-muted-foreground italic">
                  {ayah.noteBodyMd}
                </blockquote>
              ) : null}
            </li>
          );
        })}
      </ol>

      <Separator />
    </div>
  );
}
