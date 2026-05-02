/**
 * Pour chaque sourate qui a des chunks de type 'ruku', supprime tout chunk
 * de type 'surah' obsolète (resté d'une ingestion antérieure où la sourate
 * était traitée comme un seul chunk).
 *
 * Idempotent : ne supprime que les chunks 'surah' redondants.
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chunks, lessons } from "@/lib/db/schema";

async function main() {
  // Sourates ayant au moins un chunk de type 'ruku'
  const rukuSurahs = await db
    .selectDistinct({ surahId: chunks.surahId })
    .from(chunks)
    .where(eq(chunks.kind, "ruku"));

  let removed = 0;
  let lessonsReassigned = 0;

  for (const { surahId } of rukuSurahs) {
    // Trouver les chunks 'surah' à supprimer
    const stale = await db
      .select({ id: chunks.id })
      .from(chunks)
      .where(and(eq(chunks.surahId, surahId), eq(chunks.kind, "surah")));

    if (stale.length === 0) continue;

    for (const { id } of stale) {
      // Détacher les lessons éventuelles vers le 1er chunk ruku de la sourate
      // (pour ne pas perdre l'historique d'apprentissage si l'utilisateur
      // avait déjà commencé une leçon sur ce chunk obsolète).
      const firstRuku = await db
        .select({ id: chunks.id })
        .from(chunks)
        .where(and(eq(chunks.surahId, surahId), eq(chunks.kind, "ruku")))
        .orderBy(chunks.orderIndex)
        .limit(1);

      if (firstRuku.length > 0) {
        const reassigned = await db
          .update(lessons)
          .set({ chunkId: firstRuku[0]!.id })
          .where(eq(lessons.chunkId, id))
          .returning({ id: lessons.id });
        lessonsReassigned += reassigned.length;
      }

      await db.delete(chunks).where(eq(chunks.id, id));
      removed += 1;
      console.log(`  · Sourate ${surahId} — chunk obsolète #${id} supprimé`);
    }
  }

  console.log(`\n✓ Terminé : ${removed} chunks obsolètes supprimés, ${lessonsReassigned} lessons ré-assignées au 1er rukūʿ`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
