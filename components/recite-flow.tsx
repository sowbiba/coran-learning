"use client";

import { useMemo, useState, useTransition } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { teacher } from "@/lib/copy/teacher";
import type { ChunkAyah } from "@/lib/content/quran";
import type { LessonState } from "@/lib/db/schema";

type Rating = 1 | 2 | 3; // 1=OK, 2=hésité, 3=oublié

type Props = {
  chunkId: number;
  lessonId: string;
  ayahs: ChunkAyah[];
  initialState: LessonState;
};

/**
 * Mode "Réciter au Professeur" :
 *  - Texte arabe **masqué par défaut** (sablier de mémoire).
 *  - L'élève peut le révéler verset par verset s'il hésite.
 *  - Pour chaque verset, il marque OK / hésité / oublié.
 *  - À la fin, décision "maîtrisée ?" → transition d'état de la leçon.
 *
 * Persistance DB : à brancher après Auth.js. Pour l'instant, les ratings
 * restent en mémoire de la session et le bouton final affiche un toast.
 */
export function ReciteFlow({ chunkId, lessonId, ayahs, initialState }: Props) {
  const router = useRouter();
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [ratings, setRatings] = useState<Record<number, Rating>>({});
  const [submitting, startTransition] = useTransition();
  const [decision, setDecision] = useState<"pending" | "mastered" | "rejected">("pending");

  const ratedCount = Object.keys(ratings).length;
  const allRated = ratedCount === ayahs.length;

  function reveal(ayahId: number) {
    setRevealed((r) => ({ ...r, [ayahId]: true }));
  }

  function rate(ayahId: number, rating: Rating) {
    setRatings((r) => ({ ...r, [ayahId]: rating }));
  }

  const summary = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0 } as Record<Rating, number>;
    for (const r of Object.values(ratings)) counts[r]++;
    return counts;
  }, [ratings]);

  async function ensureRecited() {
    // Le serveur amène la leçon à `ready_to_recite` au chargement de la page,
    // donc ici on n'a plus qu'à enregistrer la récitation.
    await patchLesson(lessonId, {
      action: "complete_recitation",
      ratings: Object.entries(ratings).map(([ayahId, rating]) => ({
        ayahId: Number(ayahId),
        rating,
      })),
    });
  }

  function onMastered() {
    startTransition(async () => {
      try {
        await ensureRecited();
        await patchLesson(lessonId, { action: "master" });
        setDecision("mastered");
        toast.success(teacher.recite.masteredFeedback);
        router.refresh();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function onNotMastered() {
    startTransition(async () => {
      try {
        await ensureRecited();
        await patchLesson(lessonId, { action: "reject_mastery" });
        setDecision("rejected");
        toast(teacher.recite.notMasteredFeedback);
        router.refresh();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">{teacher.recite.subtitle}</p>

      <ol className="space-y-1 divide-y divide-border/40">
        {ayahs.map((ayah) => (
          <li key={ayah.id} className="space-y-3 py-6">
            <header className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Verset {ayah.numberInSurah}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => reveal(ayah.id)}
                disabled={revealed[ayah.id]}
                className="text-muted-foreground hover:text-foreground"
              >
                {revealed[ayah.id] ? (
                  <>
                    <Eye className="size-4" /> <span className="ms-1">Révélé</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="size-4" /> <span className="ms-1">{teacher.recite.revealAyah}</span>
                  </>
                )}
              </Button>
            </header>

            <div
              lang="ar"
              dir="rtl"
              className={cn(
                "arabic text-balance text-3xl leading-[2.4] transition-all",
                revealed[ayah.id]
                  ? "text-foreground"
                  : "select-none text-foreground/0 [text-shadow:0_0_24px_var(--muted-foreground)] saturate-0",
              )}
              aria-hidden={!revealed[ayah.id]}
            >
              {revealed[ayah.id] ? ayah.textUthmani : "● ".repeat(Math.min(20, ayah.textUthmani.length))}
            </div>

            <div className="flex flex-wrap gap-2">
              <RatingButton
                rating={1}
                current={ratings[ayah.id]}
                onClick={() => rate(ayah.id, 1)}
                label={teacher.recite.actionRateOk}
              />
              <RatingButton
                rating={2}
                current={ratings[ayah.id]}
                onClick={() => rate(ayah.id, 2)}
                label={teacher.recite.actionRateHesitated}
              />
              <RatingButton
                rating={3}
                current={ratings[ayah.id]}
                onClick={() => rate(ayah.id, 3)}
                label={teacher.recite.actionRateForgot}
              />
            </div>
          </li>
        ))}
      </ol>

      <Separator />

      <footer className="space-y-4">
        <div className="rounded-lg border border-border/60 bg-card/30 p-4 text-sm text-muted-foreground">
          {allRated ? (
            <>
              <strong className="text-foreground">{ratedCount} versets évalués</strong> ·{" "}
              {summary[1]} OK, {summary[2]} hésités, {summary[3]} oubliés.
            </>
          ) : (
            <>
              {ratedCount} / {ayahs.length} versets évalués. Continue jusqu'au dernier verset
              pour finaliser la décision avec ton Professeur.
            </>
          )}
        </div>

        {allRated && decision === "pending" ? (
          <div className="space-y-3">
            <p className="font-display text-xl">{teacher.recite.finalQuestion}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onMastered} disabled={submitting}>
                {submitting ? "..." : teacher.recite.finalYes}
              </Button>
              <Button variant="outline" onClick={onNotMastered} disabled={submitting}>
                {teacher.recite.finalNo}
              </Button>
            </div>
          </div>
        ) : null}

        {decision !== "pending" ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground/80">
              {decision === "mastered"
                ? teacher.recite.masteredFeedback
                : teacher.recite.notMasteredFeedback}
            </p>
            <Link
              href={`/lesson/${chunkId}`}
              className={buttonVariants({ variant: "default" })}
            >
              <ArrowRight className="size-4" />
              <span className="ms-1">Retour à la leçon</span>
            </Link>
          </div>
        ) : null}
      </footer>
    </div>
  );
}

async function patchLesson(
  lessonId: string,
  body: { action: string; ratings?: { ayahId: number; rating: 1 | 2 | 3 }[] },
): Promise<void> {
  const res = await fetch(`/api/lessons/${lessonId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
}

function RatingButton({
  rating,
  current,
  onClick,
  label,
}: {
  rating: Rating;
  current?: Rating;
  onClick: () => void;
  label: string;
}) {
  const isActive = current === rating;
  const variant: "default" | "outline" | "ghost" =
    rating === 1 ? "default" : rating === 2 ? "outline" : "ghost";

  return (
    <Button
      type="button"
      size="sm"
      variant={isActive ? "secondary" : variant}
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(isActive && "ring-1 ring-foreground/20")}
    >
      {label}
    </Button>
  );
}
