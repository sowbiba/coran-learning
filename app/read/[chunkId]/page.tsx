import { notFound } from "next/navigation";
import { ReadView } from "@/components/read-view";
import { SurahIntro } from "@/components/surah-intro";
import { BackLink, ChunkPageHeader } from "@/components/page-header";
import { teacher } from "@/lib/copy/teacher";
import { getChunkDetails } from "@/lib/content/quran";
import { getCurrentUserId } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

type RouteParams = { chunkId: string };

export default async function ReadPage({
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
  const periodLabel = chunk.surahPeriod === "meccan" ? "Mecquoise" : "Médinoise";

  return (
    <div className="quiet">
      <BackLink href={`/lesson/${chunk.id}`} label="Retour à la leçon" />

      <ChunkPageHeader
        eyebrow={teacher.read.title}
        title={chunk.surahNameTranslit}
        subtitle={`${chunk.surahNameFr} · ${chunk.ayahCount} versets · ${periodLabel}`}
        arabicName={chunk.surahNameAr}
      />

      <SurahIntro markdown={chunk.surahIntroFrMd} />

      <ReadView
        ayahs={ayahs}
        surahNameTranslit={chunk.surahNameTranslit}
        bismillah={bismillah}
      />
    </div>
  );
}
