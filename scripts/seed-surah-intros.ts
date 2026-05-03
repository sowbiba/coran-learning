/**
 * Lit les fichiers `data/surah-intros/{N}.md` et les pousse dans
 * `surahs.intro_fr_md`. Idempotent : remplace systématiquement la valeur
 * en DB par celle du fichier (le fichier est la source de vérité).
 *
 * Pour ne pas écraser une intro éditée à la main en DB sans passer par
 * MD : on n'écrit que si le contenu du MD diffère de ce qui est en DB.
 *
 * Usage :
 *   npm run seed:intros                     # toutes celles présentes sur disque
 *   SEED_ONLY=78,79,80 npm run seed:intros  # cible
 */

import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { surahs } from "@/lib/db/schema";

const SOURCE_DIR = path.resolve(process.cwd(), "data/surah-intros");

/**
 * Retire l'en-tête markdown "# 78. An-Nabaʾ — La grande nouvelle" et le
 * footer d'attribution avant de pousser. La DB stocke uniquement le
 * corps utile (le titre est redondant avec les métadonnées de la sourate
 * et le footer est interne au workflow d'édition).
 */
function extractBody(md: string): string {
  return md
    .replace(/^#\s.*\n+/m, "") // titre H1 du fichier
    .replace(/\n+---\n+\*Source[\s\S]*$/, "") // footer d'attribution
    .trim();
}

async function main() {
  const onlyEnv = process.env.SEED_ONLY;
  const only = onlyEnv ? new Set(onlyEnv.split(",").map(Number)) : null;

  const files = (await fs.readdir(SOURCE_DIR)).filter((f) => /^\d+\.md$/.test(f));
  console.log(`Sourates avec intro disponibles sur disque : ${files.length}`);

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let missingInDb = 0;

  for (const f of files) {
    const id = Number(f.replace(".md", ""));
    if (only && !only.has(id)) continue;

    const raw = await fs.readFile(path.join(SOURCE_DIR, f), "utf-8");
    const body = extractBody(raw);

    const rows = await db
      .select({ id: surahs.id, current: surahs.introFrMd })
      .from(surahs)
      .where(eq(surahs.id, id))
      .limit(1);

    if (rows.length === 0) {
      console.warn(`  ✗ Sourate ${id} non trouvée en DB — skip`);
      missingInDb++;
      continue;
    }

    if (rows[0]!.current === body) {
      unchanged++;
      continue;
    }

    await db
      .update(surahs)
      .set({ introFrMd: body })
      .where(eq(surahs.id, id));

    if (rows[0]!.current === null) {
      inserted++;
      console.log(`  + Sourate ${id} : intro insérée (${body.length} chars)`);
    } else {
      updated++;
      console.log(`  ~ Sourate ${id} : intro mise à jour (${body.length} chars)`);
    }
  }

  console.log(
    `\n✓ ${inserted} insérées, ${updated} mises à jour, ${unchanged} inchangées, ${missingInDb} introuvables`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
