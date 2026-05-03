import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PracticeFlow } from "@/components/practice-flow";
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
      <Link
        href={`/lesson/${chunk.id}`}
        className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-6 -ms-2 text-muted-foreground hover:text-foreground`}
      >
        <ArrowLeft className="me-1 size-4" />
        Retour à la leçon
      </Link>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {teacher.practice.title}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight">
          {chunk.surahNameTranslit}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{teacher.practice.subtitle}</p>
      </header>

      <PracticeFlow
        chunkId={chunk.id}
        ayahs={ayahs}
        surahNameTranslit={chunk.surahNameTranslit}
        bismillah={bismillah}
      />
    </div>
  );
}
