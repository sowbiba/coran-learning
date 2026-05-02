import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { teacher } from "@/lib/copy/teacher";
import { listChunks, type ChunkWithSurah } from "@/lib/content/quran";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { listUserLessons } from "@/lib/lessons/repo";
import { computeDailyQueue } from "@/lib/srs/scheduler";
import type { Lesson, LessonState } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function Today() {
  const [chunks, userId] = await Promise.all([listChunks(), getCurrentUserId()]);
  const lessons = await listUserLessons(userId);

  const lessonByChunk = new Map(lessons.map((l) => [l.chunkId, l]));
  const queue = computeDailyQueue(lessons, new Date());

  const inProgress: Array<{ chunk: ChunkWithSurah; lesson: Lesson }> = [];
  const dueRevisions: Array<{ chunk: ChunkWithSurah; lesson: Lesson }> = [];
  const untouched: ChunkWithSurah[] = [];

  for (const c of sortChunksForDisplay(chunks)) {
    const l = lessonByChunk.get(c.id);
    if (!l || l.state === "not_started") {
      untouched.push(c);
      continue;
    }
    const isMasteredButNotDue = l.state === "mastered" && !queue.sabqi.concat(queue.manzil).find((x) => x.id === l.id);
    if (isMasteredButNotDue) {
      // Mastered, on l'affiche dans une 4e section discrète (acquis)
      // Pour ne pas surcharger /today on les groupe ensemble en bas
      // (pas de section dédiée pour l'instant — visible dans untouched listing)
      continue;
    }
    if (l.state === "mastered") {
      dueRevisions.push({ chunk: c, lesson: l });
    } else {
      inProgress.push({ chunk: c, lesson: l });
    }
  }

  const isEmpty = inProgress.length === 0 && dueRevisions.length === 0 && untouched.length === 0;

  return (
    <div className="quiet">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {teacher.today.title}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight">
          {teacher.today.subtitle}
        </h1>
      </header>

      {isEmpty ? <EmptyState /> : null}

      {inProgress.length > 0 ? (
        <Section title={teacher.today.sectionInProgress}>
          {inProgress.map(({ chunk, lesson }, idx) => (
            <ChunkCard
              key={chunk.id}
              chunk={chunk}
              lesson={lesson}
              highlight={idx === 0}
              primaryAction={primaryActionFor(lesson.state, chunk.id)}
            />
          ))}
        </Section>
      ) : null}

      {dueRevisions.length > 0 ? (
        <>
          <Separator className="my-10" />
          <Section title={teacher.today.sectionDue}>
            {dueRevisions.map(({ chunk, lesson }) => (
              <ChunkCard
                key={chunk.id}
                chunk={chunk}
                lesson={lesson}
                primaryAction={{ label: teacher.today.actionRevise, href: `/recite/${chunk.id}` }}
              />
            ))}
          </Section>
        </>
      ) : null}

      {untouched.length > 0 ? (
        <>
          <Separator className="my-10" />
          <Section title="Leçons à découvrir">
            {untouched.map((chunk, idx) => (
              <ChunkCard
                key={chunk.id}
                chunk={chunk}
                highlight={idx === 0 && inProgress.length === 0}
                primaryAction={{
                  label: inProgress.length === 0 ? teacher.today.actionStartNew : "Avec le Professeur",
                  href: `/lesson/${chunk.id}`,
                }}
              />
            ))}
          </Section>
        </>
      ) : null}
    </div>
  );
}

function ChunkCard({
  chunk,
  lesson,
  highlight,
  primaryAction,
}: {
  chunk: ChunkWithSurah;
  lesson?: Lesson;
  highlight?: boolean;
  primaryAction: { label: string; href: string };
}) {
  const periodLabel = chunk.surahPeriod === "meccan" ? "Mecquoise" : "Médinoise";
  const stateLabel = lesson ? teacher.lessonState[lesson.state] : null;
  return (
    <Card className={highlight ? "border-foreground/20" : undefined}>
      <CardHeader className="space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-2xl tracking-tight">{chunk.surahNameTranslit}</h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            Sourate {chunk.surahId}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {chunk.surahNameFr} · {chunk.ayahCount} versets · {periodLabel}
          {stateLabel ? <span className="ms-2 italic">· {stateLabel}</span> : null}
        </p>
      </CardHeader>
      <CardContent>
        <Link
          href={primaryAction.href}
          className={buttonVariants({ variant: highlight ? "default" : "outline", size: "sm" })}
        >
          {primaryAction.label}
        </Link>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">{title}</h2>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-10 text-center">
      <p className="font-display text-2xl tracking-tight">{teacher.today.emptyTitle}</p>
      <p className="mt-2 text-sm text-muted-foreground">{teacher.today.emptySubtitle}</p>
    </div>
  );
}

function primaryActionFor(
  state: LessonState,
  chunkId: number,
): { label: string; href: string } {
  if (state === "ready_to_recite" || state === "recited") {
    return { label: "Réciter au Professeur", href: `/recite/${chunkId}` };
  }
  if (state === "introduced") {
    return { label: "Pratiquer", href: `/practice/${chunkId}` };
  }
  if (state === "learning") {
    return { label: "Continuer la pratique", href: `/practice/${chunkId}` };
  }
  return { label: teacher.today.actionContinue, href: `/lesson/${chunkId}` };
}

function sortChunksForDisplay(chunks: ChunkWithSurah[]): ChunkWithSurah[] {
  const fatiha = chunks.find((c) => c.surahId === 1);
  const rest = chunks
    .filter((c) => c.surahId !== 1)
    .sort((a, b) => b.surahId - a.surahId);
  return fatiha ? [fatiha, ...rest] : rest;
}
