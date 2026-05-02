import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { CatalogueList, type CatalogueChunk } from "@/components/catalogue-list";
import { db } from "@/lib/db/client";
import {
  ayahs as ayahsTable,
  chunks as chunksTable,
  surahs as surahsTable,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * Catalogue complet du Coran : 30 sections (juz') listant tous les
 * chunks (sourate ou rukūʿ). Grouping par juz' = vue mushaf naturelle
 * pour explorer/repérer une leçon à étudier. Avec recherche live.
 */
export default async function Catalogue() {
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

  const chunks: CatalogueChunk[] = rows.map(({ chunk, surah, firstJuz }) => ({
    id: chunk.id,
    label: chunk.label,
    ayahCount: chunk.ayahCount,
    surahId: chunk.surahId,
    surahNameTranslit: surah.nameTranslit,
    surahNameFr: surah.nameFr,
    juz: firstJuz,
  }));

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
          Tout le Coran, en {chunks.length} leçons
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Les sourates courtes sont une leçon ; les sourates longues sont
          découpées en rukūʿ (unités thématiques d'~8-12 versets). Cherche
          une sourate ou parcours par juzʾ.
        </p>
      </header>

      <CatalogueList chunks={chunks} />
    </div>
  );
}
