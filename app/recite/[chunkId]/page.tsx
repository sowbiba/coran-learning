import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ReciteFlow } from "@/components/recite-flow";
import { teacher } from "@/lib/copy/teacher";
import { getChunkDetails } from "@/lib/content/quran";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getOrCreateLesson, prepareLessonForRecitation } from "@/lib/lessons/repo";

export const dynamic = "force-dynamic";

type RouteParams = { chunkId: string };

export default async function RecitePage({
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
  const initial = await getOrCreateLesson(userId, id);
  const lesson = await prepareLessonForRecitation(initial);

  const { chunk, ayahs } = details;

  return (
    <div className="quiet">
      <Link
        href={`/lesson/${chunk.id}`}
        className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-6 -ms-2 text-muted-foreground hover:text-foreground`}
      >
        <ArrowLeft className="me-1 size-4" />
        Retour à la leçon
      </Link>

      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {teacher.recite.title}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight">
          {chunk.surahNameTranslit}
        </h1>
      </header>

      <ReciteFlow chunkId={chunk.id} lessonId={lesson.id} ayahs={ayahs} initialState={lesson.state} />
    </div>
  );
}
