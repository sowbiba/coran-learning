"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AudioPlayer } from "@/components/audio-player";
import { BismillahHeader } from "@/components/bismillah-header";
import { NoteEditor } from "@/components/note-editor";
import { cn } from "@/lib/utils";
import { teacher } from "@/lib/copy/teacher";
import type { ChunkAyah } from "@/lib/content/quran";
import type { LessonState } from "@/lib/db/schema";

const STEPS = ["listen", "read", "understand", "repeat"] as const;
type Step = (typeof STEPS)[number];

type StepCopy = {
  step: Step;
  title: string;
  hint: string;
  showArabic: boolean;
  showTranslit: boolean;
  showFr: boolean;
};

const STEP_COPY: StepCopy[] = [
  {
    step: "listen",
    title: teacher.lesson.stepListen,
    hint: teacher.lesson.stepListenHint,
    showArabic: false,
    showTranslit: false,
    showFr: false,
  },
  {
    step: "read",
    title: teacher.lesson.stepRead,
    hint: teacher.lesson.stepReadHint,
    showArabic: true,
    showTranslit: false,
    showFr: false,
  },
  {
    step: "understand",
    title: teacher.lesson.stepMeaning,
    hint: teacher.lesson.stepMeaningHint,
    showArabic: true,
    showTranslit: true,
    showFr: true,
  },
  {
    step: "repeat",
    title: teacher.lesson.stepRepeat,
    hint: teacher.lesson.stepRepeatHint,
    showArabic: true,
    showTranslit: true,
    showFr: true,
  },
];

type Props = {
  chunkId: number;
  lessonId: string;
  ayahs: ChunkAyah[];
  initialState: LessonState;
  surahNameTranslit: string;
  bismillah: string | null;
};

/**
 * Séquence guidée "Avec le Professeur" — 4 étapes :
 *   1. Écoute (audio seul, texte masqué)
 *   2. Lecture (texte arabe + audio)
 *   3. Compréhension (+ sens et translit)
 *   4. Répétition (l'élève répète à voix haute)
 *
 * Au bout, "J'ai compris l'introduction" passe la leçon à `introduced`
 * via PATCH /api/lessons/[id] et propose de continuer en pratique
 * autonome ou de venir réciter directement.
 */
export function LessonGuide({ chunkId, lessonId, ayahs, initialState, surahNameTranslit, bismillah }: Props) {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [submitting, startTransition] = useTransition();
  const [done, setDone] = useState(initialState !== "not_started");

  const current = STEP_COPY[stepIdx]!;
  const isLast = stepIdx === STEPS.length - 1;
  const isFirst = stepIdx === 0;
  const stepNumber = stepIdx + 1;

  function next() {
    if (!isLast) setStepIdx((s) => s + 1);
  }

  function prev() {
    if (!isFirst) setStepIdx((s) => s - 1);
  }

  function finish() {
    startTransition(async () => {
      try {
        // Si la leçon est déjà introduced ou plus avancée, l'appel à
        // "introduce" est idempotent (la machine d'état renvoie OK
        // sans changer l'état).
        if (initialState === "not_started") {
          await patchLesson(lessonId, { action: "introduce" });
        } else {
          await patchLesson(lessonId, { action: "review_introduction" });
        }
        setDone(true);
        toast.success("Introduction terminée. À toi de jouer.");
        router.refresh();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Indicateur d'étape */}
      <ol className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "size-6 rounded-full border text-center leading-[22px]",
                i < stepIdx
                  ? "border-foreground/40 bg-foreground/10 text-foreground"
                  : i === stepIdx
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/40",
              )}
            >
              {i < stepIdx ? <Check className="mx-auto size-3.5" /> : i + 1}
            </span>
            {i < STEPS.length - 1 ? (
              <span aria-hidden className="h-px w-6 bg-border/40" />
            ) : null}
          </li>
        ))}
      </ol>

      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Étape {stepNumber} / {STEPS.length}
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-tight">{current.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{current.hint}</p>
      </header>

      <Separator />

      {bismillah && current.showArabic ? <BismillahHeader text={bismillah} /> : null}

      <ol className="space-y-1 divide-y divide-border/40">
        {ayahs.map((ayah, idx) => (
          <GuideAyah
            key={ayah.id}
            ayah={ayah}
            position={idx + 1}
            step={current}
            surahNameTranslit={surahNameTranslit}
          />
        ))}
      </ol>

      <Separator />

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={prev}
          disabled={isFirst}
        >
          <ChevronLeft className="size-4" />
          <span className="ms-1">Précédent</span>
        </Button>

        {!isLast ? (
          <Button onClick={next}>
            Suivant
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={finish} disabled={submitting || done}>
            {done ? "Introduction terminée" : submitting ? "..." : teacher.lesson.actionDone}
          </Button>
        )}
      </div>

      {done ? (
        <div className="space-y-3 rounded-lg border border-border/60 bg-card/30 p-5">
          <p className="text-sm text-foreground/80">{teacher.lesson.actionDoneHint}</p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/practice/${chunkId}`} className={buttonVariants()}>
              {teacher.practice.title}
            </Link>
            <Link
              href={`/recite/${chunkId}`}
              className={buttonVariants({ variant: "outline" })}
            >
              {teacher.practice.actionReadyToRecite}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GuideAyah({
  ayah,
  position,
  step,
  surahNameTranslit,
}: {
  ayah: ChunkAyah;
  position: number;
  step: StepCopy;
  surahNameTranslit: string;
}) {
  return (
    <article className="space-y-3 py-6">
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
          {ayah.audioUrl ? <AudioPlayer src={ayah.audioUrl} label="Écouter" /> : null}
        </div>
      </header>

      {step.showArabic ? (
        <p
          lang="ar"
          dir="rtl"
          className="arabic text-balance text-3xl leading-[2.4] text-foreground"
        >
          {ayah.textUthmani}
        </p>
      ) : (
        <p className="font-display text-base text-muted-foreground">
          Verset {ayah.numberInSurah} — écoute la récitation.
        </p>
      )}

      {step.showTranslit && ayah.transliteration && ayah.transliteration.length > 0 ? (
        <p className="translit text-sm">
          {ayah.transliteration.map((w, i) => (
            <span key={i} className="me-2 inline-block">
              {w.latin}
            </span>
          ))}
        </p>
      ) : null}

      {step.showFr && ayah.textFr ? (
        <p className="text-base leading-relaxed text-foreground/80">{ayah.textFr}</p>
      ) : null}

      {ayah.noteBodyMd && step.showFr ? (
        <blockquote className="mt-2 border-s-2 border-foreground/30 ps-3 text-sm text-muted-foreground italic">
          {ayah.noteBodyMd}
        </blockquote>
      ) : null}
    </article>
  );
}

import { sendOrEnqueue } from "@/lib/sync/outbox";

async function patchLesson(
  lessonId: string,
  body: { action: string },
): Promise<void> {
  await sendOrEnqueue({
    url: `/api/lessons/${lessonId}`,
    method: "PATCH",
    body,
  });
}
