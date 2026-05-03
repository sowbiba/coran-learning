"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Repeat } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { teacher } from "@/lib/copy/teacher";
import { VoiceRecorder } from "@/components/voice-recorder";
import { NoteEditor } from "@/components/note-editor";
import { BismillahHeader } from "@/components/bismillah-header";
import Link from "next/link";
import type { ChunkAyah } from "@/lib/content/quran";

const SPEEDS = [0.75, 1, 1.25] as const;

type Props = {
  chunkId: number;
  ayahs: ChunkAyah[];
  surahNameTranslit: string;
  bismillah: string | null;
};

/**
 * Mode "En autonomie" : l'élève pratique librement à son rythme.
 *
 * - Verset par verset, navigation manuelle (Précédent / Suivant).
 * - Lecture audio : play/pause, boucle (rejoue le même verset à la fin), vitesse.
 * - Toggle pour masquer translittération et / ou traduction (utile quand on
 *   se teste partiellement sans aller jusqu'au mode /recite).
 *
 * Pas de mutation côté DB pour l'instant — l'auth viendra ensuite et on
 * câblera POST /api/recitations + PATCH /api/lessons.
 */
export function PracticeFlow({ chunkId, ayahs, surahNameTranslit, bismillah }: Props) {
  const [index, setIndex] = useState(0);
  const [showTranslit, setShowTranslit] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  const ayah = ayahs[index];

  // Reset le lecteur quand on change de verset
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    setPlaying(false);
    el.currentTime = 0;
  }, [index]);

  // Applique la vitesse en cours
  useEffect(() => {
    const el = audioRef.current;
    if (el) el.playbackRate = speed;
  }, [speed]);

  // Câble events de l'audio
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      if (loop) {
        el.currentTime = 0;
        void el.play();
      } else {
        setPlaying(false);
      }
    };
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [loop]);

  if (!ayah) {
    return <p className="text-sm text-muted-foreground">Aucun verset à pratiquer.</p>;
  }

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }

  function goPrev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  function goNext() {
    setIndex((i) => Math.min(ayahs.length - 1, i + 1));
  }

  return (
    <div className="space-y-8">
      {/* Sélecteur de verset */}
      <header className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={goPrev}
          disabled={index === 0}
          aria-label="Verset précédent"
        >
          <ChevronLeft className="size-4" />
          Précédent
        </Button>

        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Verset {ayah.numberInSurah} / {ayahs.length}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={goNext}
          disabled={index === ayahs.length - 1}
          aria-label="Verset suivant"
        >
          Suivant
          <ChevronRight className="size-4" />
        </Button>
      </header>

      {/* Verset */}
      <article className="space-y-6">
        {bismillah && ayah.numberInSurah === 1 ? (
          <BismillahHeader text={bismillah} />
        ) : null}

        <p
          lang="ar"
          dir="rtl"
          className="arabic text-balance text-3xl leading-[2.6] text-foreground"
        >
          {ayah.textUthmani}
        </p>

        {showTranslit && ayah.transliteration && ayah.transliteration.length > 0 ? (
          <p className="translit">
            {ayah.transliteration.map((w, i) => (
              <span key={i} className="me-2 inline-block">
                {w.latin}
              </span>
            ))}
          </p>
        ) : null}

        {showTranslation && ayah.textFr ? (
          <p className="text-base leading-relaxed text-foreground/80">{ayah.textFr}</p>
        ) : null}

        {ayah.noteBodyMd ? (
          <blockquote className="border-s-2 border-foreground/30 ps-3 text-sm text-muted-foreground italic">
            {ayah.noteBodyMd}
          </blockquote>
        ) : null}
      </article>

      <Separator />

      {/* Contrôles audio */}
      <div className="flex flex-wrap items-center gap-2">
        {ayah.audioUrl ? (
          <>
            <Button
              variant="default"
              size="sm"
              onClick={togglePlay}
              aria-label={playing ? "Mettre en pause" : "Écouter"}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              <span className="ms-1">{playing ? "Pause" : "Écouter"}</span>
            </Button>

            <Button
              variant={loop ? "secondary" : "outline"}
              size="sm"
              onClick={() => setLoop((l) => !l)}
              aria-pressed={loop}
              aria-label="Boucler ce verset"
            >
              <Repeat className="size-4" />
              <span className="ms-1">Boucle</span>
            </Button>

            <div className="ms-2 inline-flex rounded-md border border-border/60 p-0.5">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "rounded-sm px-2 py-1 text-xs transition-colors",
                    s === speed
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-pressed={s === speed}
                >
                  {s}×
                </button>
              ))}
            </div>

            <div className="ms-auto">
              <NoteEditor
                ayahId={ayah.id}
                ayahNumberInSurah={ayah.numberInSurah}
                surahNameTranslit={surahNameTranslit}
                initialBody={ayah.noteBodyMd ?? ""}
              />
            </div>

            <audio ref={audioRef} src={ayah.audioUrl} preload="none" />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Audio indisponible pour ce verset.</p>
        )}
      </div>

      {/* Toggles d'affichage */}
      <div className="flex flex-wrap gap-3">
        <ToggleChip
          active={showTranslit}
          onClick={() => setShowTranslit((v) => !v)}
          label={teacher.practice.toggleTranslit}
        />
        <ToggleChip
          active={showTranslation}
          onClick={() => setShowTranslation((v) => !v)}
          label={teacher.practice.toggleTranslation}
        />
      </div>

      <Separator />

      {/* Enregistrement vocal pour ce verset */}
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {teacher.practice.recordTitle}
        </p>
        <p className="text-sm text-muted-foreground">{teacher.practice.recordHint}</p>
        <VoiceRecorder ayahId={ayah.id} />
      </section>

      <Separator />

      {/* Action finale */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{teacher.practice.actionReadyHint}</p>
        <Link
          href={`/recite/${chunkId}`}
          className={buttonVariants({ variant: "default" })}
        >
          {teacher.practice.actionReadyToRecite}
        </Link>
      </div>
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-foreground/30 bg-foreground/5 text-foreground"
          : "border-border/40 text-muted-foreground hover:text-foreground",
      )}
    >
      {label} · {active ? teacher.practice.toggleStateVisible : teacher.practice.toggleStateHidden}
    </button>
  );
}
