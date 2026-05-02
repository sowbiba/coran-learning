/**
 * Sanity check rapide après ingestion.
 * Compte les rows par table et affiche la 1ère sourate ingérée pour vérifier
 * que le texte arabe + la traduction française sont bien présents.
 */

import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  ayahs,
  audioFiles,
  chunks,
  surahs,
  translations,
} from "@/lib/db/schema";

async function main() {
  const [
    surahCount,
    ayahCount,
    transCount,
    audioCount,
    chunkCount,
  ] = await Promise.all([
    db.select({ n: count() }).from(surahs),
    db.select({ n: count() }).from(ayahs),
    db.select({ n: count() }).from(translations),
    db.select({ n: count() }).from(audioFiles),
    db.select({ n: count() }).from(chunks),
  ]);

  console.log("─ Comptes par table ─");
  console.log(`  surahs        : ${surahCount[0]?.n}`);
  console.log(`  ayahs         : ${ayahCount[0]?.n}`);
  console.log(`  translations  : ${transCount[0]?.n}`);
  console.log(`  audio_files   : ${audioCount[0]?.n}`);
  console.log(`  chunks        : ${chunkCount[0]?.n}`);

  // Petite preuve qualitative : sortir Al-Fātiḥa ayah 1
  const fatihaAr = await db
    .select()
    .from(ayahs)
    .where(eq(ayahs.surahId, 1))
    .limit(2);

  const fatihaTr = await db
    .select()
    .from(translations)
    .where(eq(translations.ayahId, 1));

  const fatihaAudio = await db
    .select()
    .from(audioFiles)
    .where(eq(audioFiles.ayahId, 1));

  console.log("\n─ Al-Fātiḥa, ayah 1 ─");
  console.log(`  arabe : ${fatihaAr[0]?.textUthmani}`);
  console.log(`  fr    : ${fatihaTr[0]?.text}`);
  console.log(`  audio : ${fatihaAudio[0]?.url}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
