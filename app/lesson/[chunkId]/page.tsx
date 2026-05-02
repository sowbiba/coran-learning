import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AyahRow } from "@/components/ayah-row";
import { teacher } from "@/lib/copy/teacher";
import { getChunkDetails } from "@/lib/content/quran";

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

  const { chunk, ayahs } = details;
  const isFatiha = chunk.surahId === 1;
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

      <header className="mb-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {teacher.lesson.title}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight">
          {chunk.surahNameTranslit}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {chunk.surahNameFr} · Sourate {chunk.surahId} · {chunk.ayahCount} versets · {periodLabel}
        </p>
      </header>

      <p
        lang="ar"
        dir="rtl"
        className="arabic mt-4 text-2xl leading-loose text-muted-foreground/80"
        aria-hidden
      >
        {chunk.surahNameAr}
      </p>

      <Separator className="my-8" />

      <section className="space-y-1 divide-y divide-border/40">
        {ayahs.map((ayah, idx) => (
          <AyahRow
            key={ayah.id}
            ayah={ayah}
            isBasmala={isFatiha && idx === 0}
          />
        ))}
      </section>

      <Separator className="my-10" />

      <footer className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {teacher.lesson.actionDoneHint}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/practice/${chunk.id}`} className={buttonVariants()}>
            {teacher.practice.title}
          </Link>
          <Link
            href={`/recite/${chunk.id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            {teacher.practice.actionReadyToRecite}
          </Link>
        </div>
      </footer>
    </div>
  );
}
