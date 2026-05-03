import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LessonGuide } from "@/components/lesson-guide";
import { SurahIntro } from "@/components/surah-intro";
import { BackLink, ChunkPageHeader } from "@/components/page-header";
import { teacher } from "@/lib/copy/teacher";
import { getAdjacentChunks, getChunkDetails } from "@/lib/content/quran";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getOrCreateLesson } from "@/lib/lessons/repo";

export const dynamic = "force-dynamic";

type RouteParams = { chunkId: string };

export default async function LessonPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { chunkId } = await params;
  const id = Number.parseInt(chunkId, 10);
  if (!Number.isFinite(id)) notFound();

  const userId = await getCurrentUserId();
  const [details, adjacent] = await Promise.all([
    getChunkDetails(id, userId),
    getAdjacentChunks(id),
  ]);
  if (!details) notFound();

  const lesson = await getOrCreateLesson(userId, id);

  const { chunk, ayahs, bismillah } = details;
  const periodLabel = chunk.surahPeriod === "meccan" ? "Mecquoise" : "Médinoise";

  return (
    <div className="quiet">
      <BackLink href="/" label="Retour au tableau du jour" />

      <ChunkPageHeader
        eyebrow={teacher.lesson.title}
        title={chunk.surahNameTranslit}
        subtitle={`${chunk.surahNameFr} · Sourate ${chunk.surahId} · ${chunk.ayahCount} versets · ${periodLabel}`}
        arabicName={chunk.surahNameAr}
        trailing={
          <Link
            href={`/read/${chunk.id}`}
            className={`${buttonVariants({ variant: "ghost", size: "sm" })} text-muted-foreground hover:text-foreground`}
          >
            {teacher.read.actionOpen}
          </Link>
        }
      />

      <SurahIntro markdown={chunk.surahIntroFrMd} />

      <LessonGuide
        chunkId={chunk.id}
        lessonId={lesson.id}
        ayahs={ayahs}
        initialState={lesson.state}
        surahNameTranslit={chunk.surahNameTranslit}
        bismillah={bismillah}
      />

      <nav className="mt-12 flex items-center justify-between gap-3 text-sm">
        {adjacent.prev ? (
          <Link
            href={`/lesson/${adjacent.prev.id}`}
            className="group flex flex-1 flex-col items-start text-muted-foreground hover:text-foreground"
          >
            <span className="text-[11px] uppercase tracking-[0.18em]">Leçon précédente</span>
            <span className="mt-0.5 inline-flex items-center gap-1 font-display text-base">
              <ChevronLeft className="size-4" />
              {adjacent.prev.label}
            </span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {adjacent.next ? (
          <Link
            href={`/lesson/${adjacent.next.id}`}
            className="group flex flex-1 flex-col items-end text-muted-foreground hover:text-foreground"
          >
            <span className="text-[11px] uppercase tracking-[0.18em]">Leçon suivante</span>
            <span className="mt-0.5 inline-flex items-center gap-1 font-display text-base">
              {adjacent.next.label}
              <ChevronRight className="size-4" />
            </span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
      </nav>
    </div>
  );
}
