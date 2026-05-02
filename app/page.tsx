import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { teacher } from "@/lib/copy/teacher";
import { listChunks, type ChunkWithSurah } from "@/lib/content/quran";

export const dynamic = "force-dynamic";

export default async function Today() {
  const chunks = await listChunks();
  const sorted = sortChunksForDisplay(chunks);

  return (
    <div className="quiet">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {teacher.today.title}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight">
          {teacher.today.subtitle}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Al-Fātiḥa et le 30ème juz' sont disponibles. {sorted.length} leçons à explorer pour le moment.
        </p>
      </header>

      <Section title="Choisir une leçon">
        {sorted.map((chunk, idx) => (
          <ChunkCard key={chunk.id} chunk={chunk} highlight={idx === 0} />
        ))}
      </Section>

      <Separator className="my-10" />

      <p className="text-xs text-muted-foreground">
        L'authentification, la persistance des leçons en cours et la file de révision viendront
        dans les prochaines étapes. Pour l'instant, tu peux ouvrir n'importe quelle sourate
        pour voir le texte arabe, la traduction et écouter la récitation Husary Muʿallim.
      </p>
    </div>
  );
}

function ChunkCard({ chunk, highlight }: { chunk: ChunkWithSurah; highlight?: boolean }) {
  const periodLabel = chunk.surahPeriod === "meccan" ? "Mecquoise" : "Médinoise";
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
        </p>
      </CardHeader>
      <CardContent>
        <Link
          href={`/lesson/${chunk.id}`}
          className={buttonVariants({ variant: highlight ? "default" : "outline", size: "sm" })}
        >
          Avec le Professeur
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

/**
 * Ordre d'affichage : Al-Fātiḥa en premier (sourate de la prière, à connaître),
 * puis le reste du juz' 30 en ordre inverse du muṣḥaf (An-Nās → An-Nabaʾ),
 * convention pédagogique : on commence par les sourates les plus courtes.
 */
function sortChunksForDisplay(chunks: ChunkWithSurah[]): ChunkWithSurah[] {
  const fatiha = chunks.find((c) => c.surahId === 1);
  const rest = chunks
    .filter((c) => c.surahId !== 1)
    .sort((a, b) => b.surahId - a.surahId);
  return fatiha ? [fatiha, ...rest] : rest;
}
