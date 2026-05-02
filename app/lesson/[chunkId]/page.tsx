import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LessonGuide } from "@/components/lesson-guide";
import { teacher } from "@/lib/copy/teacher";
import { getChunkDetails } from "@/lib/content/quran";
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

  const details = await getChunkDetails(id);
  if (!details) notFound();

  const userId = await getCurrentUserId();
  const lesson = await getOrCreateLesson(userId, id);

  const { chunk, ayahs } = details;
  const periodLabel = chunk.surahPeriod === "meccan" ? "Mecquoise" : "Médinoise";

  return (
    <div className="quiet">
      <Link
        href="/"
        className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-6 -ms-2 text-muted-foreground hover:text-foreground`}
      >
        <ArrowLeft className="me-1 size-4" />
        Retour au tableau du jour
      </Link>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {teacher.lesson.title}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight">
          {chunk.surahNameTranslit}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {chunk.surahNameFr} · Sourate {chunk.surahId} · {chunk.ayahCount} versets · {periodLabel}
        </p>
        <p
          lang="ar"
          dir="rtl"
          className="arabic mt-4 text-2xl leading-loose text-muted-foreground/80"
          aria-hidden
        >
          {chunk.surahNameAr}
        </p>
      </header>

      <LessonGuide
        chunkId={chunk.id}
        lessonId={lesson.id}
        ayahs={ayahs}
        initialState={lesson.state}
      />
    </div>
  );
}
