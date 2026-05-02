import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { asc, eq, between } from "drizzle-orm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db/client";
import {
  ayahs as ayahsTable,
  chunks as chunksTable,
  surahs as surahsTable,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type CatalogueChunk = {
  id: number;
  label: string;
  ayahCount: number;
  surahId: number;
  surahNameTranslit: string;
  surahNameFr: string;
  juz: number;
};

/**
 * Catalogue complet du Coran : 30 sections (juz') listant tous les
 * chunks (sourate ou rukūʿ). Grouping par juz' = vue mushaf naturelle
 * pour explorer/repérer une leçon à étudier.
 */
export default async function Catalogue() {
  // Pour chaque chunk, on prend le juz' du 1er ayah (un chunk = 1 surah ou
  // 1 rukūʿ et tient typiquement dans un seul juz').
  const rows = await db
    .select({
      chunk: chunksTable,
      surah: surahsTable,
      firstJuz: ayahsTable.juz,
    })
    .from(chunksTable)
    .innerJoin(surahsTable, eq(chunksTable.surahId, surahsTable.id))
    .innerJoin(ayahsTable, eq(ayahsTable.id, chunksTable.firstAyahId))
    .orderBy(asc(chunksTable.orderIndex));

  // Group by juz'
  const byJuz = new Map<number, CatalogueChunk[]>();
  for (const { chunk, surah, firstJuz } of rows) {
    const list = byJuz.get(firstJuz) ?? [];
    list.push({
      id: chunk.id,
      label: chunk.label,
      ayahCount: chunk.ayahCount,
      surahId: chunk.surahId,
      surahNameTranslit: surah.nameTranslit,
      surahNameFr: surah.nameFr,
      juz: firstJuz,
    });
    byJuz.set(firstJuz, list);
  }

  const juzList = Array.from(byJuz.keys()).sort((a, b) => a - b);

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
          Catalogue
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight">
          Tout le Coran, en {rows.length} leçons
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Les sourates courtes sont une leçon ; les sourates longues sont
          découpées en rukūʿ (unités thématiques d'~8-12 versets). Choisis
          par où commencer.
        </p>
      </header>

      <nav className="mb-10 flex flex-wrap gap-1.5 text-xs">
        {juzList.map((j) => (
          <a
            key={j}
            href={`#juz-${j}`}
            className="rounded-md border border-border/60 px-2 py-1 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            Juz' {j}
          </a>
        ))}
      </nav>

      <div className="space-y-12">
        {juzList.map((juz) => (
          <JuzSection key={juz} juz={juz} chunks={byJuz.get(juz) ?? []} />
        ))}
      </div>
    </div>
  );
}

function JuzSection({ juz, chunks }: { juz: number; chunks: CatalogueChunk[] }) {
  return (
    <section id={`juz-${juz}`} className="scroll-mt-8">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
          Juzʾ {juz}
        </p>
        <h2 className="mt-1 font-display text-2xl tracking-tight">
          {chunks.length} leçon{chunks.length > 1 ? "s" : ""}
        </h2>
      </header>
      <div className="grid gap-3">
        {chunks.map((c) => (
          <Card key={c.id}>
            <CardHeader className="space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-xl tracking-tight">{c.label}</h3>
                <span className="text-xs text-muted-foreground tabular-nums">
                  Sourate {c.surahId}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {c.surahNameFr} · {c.ayahCount} versets
              </p>
            </CardHeader>
            <CardContent>
              <Link
                href={`/lesson/${c.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Avec le Professeur
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      <Separator className="mt-12" />
    </section>
  );
}
