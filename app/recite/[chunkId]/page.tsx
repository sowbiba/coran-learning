import { notFound } from "next/navigation";
import { ReciteFlow } from "@/components/recite-flow";
import { BackLink, ChunkPageHeader } from "@/components/page-header";
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

  const userId = await getCurrentUserId();
  const details = await getChunkDetails(id, userId);
  if (!details) notFound();

  const initial = await getOrCreateLesson(userId, id);
  const lesson = await prepareLessonForRecitation(initial);

  const { chunk, ayahs, bismillah } = details;

  return (
    <div className="quiet">
      <BackLink href={`/lesson/${chunk.id}`} label="Retour à la leçon" />

      <ChunkPageHeader
        eyebrow={teacher.recite.title}
        title={chunk.surahNameTranslit}
      />

      <ReciteFlow
        chunkId={chunk.id}
        lessonId={lesson.id}
        ayahs={ayahs}
        initialState={lesson.state}
        bismillah={bismillah}
      />
    </div>
  );
}
