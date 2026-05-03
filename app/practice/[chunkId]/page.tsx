import { notFound } from "next/navigation";
import { PracticeFlow } from "@/components/practice-flow";
import { BackLink, ChunkPageHeader } from "@/components/page-header";
import { teacher } from "@/lib/copy/teacher";
import { getChunkDetails } from "@/lib/content/quran";
import { getCurrentUserId } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

type RouteParams = { chunkId: string };

export default async function PracticePage({
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

  const { chunk, ayahs, bismillah } = details;

  return (
    <div className="quiet">
      <BackLink href={`/lesson/${chunk.id}`} label="Retour à la leçon" />

      <ChunkPageHeader
        eyebrow={teacher.practice.title}
        title={chunk.surahNameTranslit}
        subtitle={teacher.practice.subtitle}
      />

      <PracticeFlow
        chunkId={chunk.id}
        ayahs={ayahs}
        surahNameTranslit={chunk.surahNameTranslit}
        bismillah={bismillah}
      />
    </div>
  );
}
