/**
 * Ingestion des translittérations phonétiques depuis l'export Notion.
 *
 * Pré-requis : `data/notion-pages.json` au format
 *   { "<surahId>": "<raw markdown enrichi du MCP Notion>", ... }
 *
 * Le script :
 *  - Parse chaque page (séparateur `---` entre versets)
 *  - Extrait pour chaque verset : (numéro, translit latine en italique)
 *  - Mappe (surahId, numberInSurah) → ayah_id global via la DB
 *  - Stocke `wordsJson` = array de {ar:"", latin:"<word>"} en
 *    splittant la translit sur les espaces (l'utilisateur pourra
 *    éditer chaque mot individuellement dans l'app)
 *  - Si l'utilisateur a déjà édité (`editedByUser=true`), on skip
 *    pour ne pas écraser ses modifications
 *  - Idempotent : safe à re-runner
 *
 * Usage : `npm run ingest:notion`
 */

import fs from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  ayahs,
  transliterations,
  type TransliterationWord,
} from "@/lib/db/schema";
import { parseNotionSurahPage } from "@/lib/content/notion-translit-parser";

async function main() {
  const filePath = path.resolve(process.cwd(), "data/notion-pages.json");
  const raw = await fs.readFile(filePath, "utf-8");
  const data: Record<string, string> = JSON.parse(raw);

  let inserted = 0;
  let updated = 0;
  let preserved = 0;
  let missing = 0;
  let parseFailed = 0;

  console.log(`Ingestion Notion translit — ${Object.keys(data).length} sourates\n`);

  for (const [surahIdStr, content] of Object.entries(data)) {
    const surahId = Number(surahIdStr);
    const verses = parseNotionSurahPage(content);

    if (verses.length === 0) {
      console.warn(`  ✗ Sourate ${surahIdStr} : 0 versets parsés`);
      parseFailed++;
      continue;
    }

    let touched = 0;
    for (const v of verses) {
      // Map (surahId, numberInSurah) → ayah_id global
      const ayahRow = await db
        .select({ id: ayahs.id })
        .from(ayahs)
        .where(
          and(
            eq(ayahs.surahId, surahId),
            eq(ayahs.numberInSurah, v.numberInSurah),
          ),
        )
        .limit(1);

      if (ayahRow.length === 0) {
        missing++;
        continue;
      }
      const ayahId = ayahRow[0]!.id;

      // Préserver les éditions utilisateur
      const existing = await db
        .select()
        .from(transliterations)
        .where(eq(transliterations.ayahId, ayahId))
        .limit(1);

      if (existing.length > 0 && existing[0]!.editedByUser) {
        preserved++;
        continue;
      }

      const words: TransliterationWord[] = v.translit
        .split(/\s+/)
        .filter(Boolean)
        .map((latin) => ({ ar: "", latin }));

      if (existing.length > 0) {
        await db
          .update(transliterations)
          .set({ wordsJson: words, editedByUser: false, updatedAt: new Date() })
          .where(eq(transliterations.ayahId, ayahId));
        updated++;
      } else {
        await db.insert(transliterations).values({
          ayahId,
          wordsJson: words,
          editedByUser: false,
        });
        inserted++;
      }
      touched++;
    }
    console.log(
      `  · Sourate ${surahId.toString().padStart(3)} — ${touched} versets ingérés`,
    );
  }

  console.log(
    `\n✓ Terminé : ${inserted} inserted, ${updated} updated, ${preserved} preserved (user-edited), ${missing} missing (surah/ayah not in DB), ${parseFailed} parse-failed`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
