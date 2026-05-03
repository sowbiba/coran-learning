import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ReadView } from "@/components/read-view";
import { SurahIntro } from "@/components/surah-intro";
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
      <Link
        href={`/lesson/${chunk.id}`}
        className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-6 -ms-2 text-muted-foreground hover:text-foreground`}
      >
        <ArrowLeft className="me-1 size-4" />
        Retour à la leçon
      </Link>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {teacher.read.title}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight">
          {chunk.surahNameTranslit}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {chunk.surahNameFr} · {chunk.ayahCount} versets · {periodLabel}
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

      <SurahIntro markdown={chunk.surahIntroFrMd} />

      <ReadView
        ayahs={ayahs}
        surahNameTranslit={chunk.surahNameTranslit}
        bismillah={bismillah}
      />
    </div>
  );
}
