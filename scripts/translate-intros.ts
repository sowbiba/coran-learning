/**
 * Traduit + condense les intros de sourate actuellement en anglais
 * (Maududi via Quran.com) vers un français propre, ~300 mots.
 *
 * Préserve : période et lieu de révélation, asbāb al-nuzūl, thèmes,
 * prophètes / récits cités, versets notables.
 *
 * Coupe : digressions théologiques, opinions personnelles, répétitions.
 *
 * Source : Vercel AI Gateway → Claude Haiku 4.5 (le moins cher de la
 * famille Claude). Coût estimé total : ~$0.10 - 0.20 pour les ~108
 * sourates en EN.
 *
 * Pré-requis :
 *   1. Créer un AI Gateway key sur Vercel : https://vercel.com/dashboard/ai-gateway
 *   2. Ajouter dans .env.local :  AI_GATEWAY_API_KEY=vck_...
 *
 * Usage :
 *   npm run translate:intros                    # toutes les EN
 *   TRANSLATE_ONLY=78,79 npm run translate:intros  # cible
 *   TRANSLATE_FORCE=1 npm run translate:intros  # re-traduire même les FR
 *
 * Le script détecte les fichiers EN par leur footer
 * "*Source : ... (anglais à traduire)*". Après traduction, le footer
 * devient "*Source : Maududi (Quran.com), traduit + condensé par
 * Claude Haiku 4.5*".
 */

import fs from "node:fs/promises";
import path from "node:path";
import { generateText } from "ai";

const SOURCE_DIR = path.resolve(process.cwd(), "data/surah-intros");
const MODEL = "anthropic/claude-haiku-4-5";

if (!process.env.AI_GATEWAY_API_KEY) {
  console.error(
    "✗ AI_GATEWAY_API_KEY manquant dans l'environnement.\n" +
      "  1. Créer une clé : https://vercel.com/dashboard/ai-gateway\n" +
      "  2. Ajouter AI_GATEWAY_API_KEY=vck_... dans .env.local",
  );
  process.exit(1);
}

const SYSTEM_PROMPT = `Tu es un copiste pédagogue spécialisé en sciences coraniques. Tu reçois une introduction de sourate écrite en anglais (souvent par Sayyid Maududi). Ta mission : produire une version française CONDENSÉE et NEUTRE.

Contraintes strictes :
1. Longueur cible : 250 à 350 mots (pas plus). Sois sec.
2. Conserve obligatoirement :
   - La période de révélation (mecquoise / médinoise) et le moment précis si connu
   - Asbāb al-nuzūl si mentionné (circonstances historiques de la révélation)
   - Les thèmes principaux (foi, droit, eschatologie, récits...)
   - Les prophètes et figures cités (Moïse, Joseph, Abraham, Marie...)
   - Les versets notables (verset du Trône, verset de la Lumière, etc.)
   - Les particularités de récitation ou de mémorisation si pertinent
3. Coupe :
   - Les digressions théologiques de l'auteur
   - Ses opinions personnelles et jugements
   - Les répétitions
   - Les références à d'autres œuvres de Maududi
4. Style :
   - Registre soutenu, factuel, calme
   - Pas de "il convient de noter que…", "il est important de signaler…"
   - Pas d'emoji, pas d'exclamations, pas de "Bravo !"
   - Tutoie l'élève si nécessaire (cohérent avec le ton "Professeur")
   - Format markdown : paragraphes courts séparés par une ligne vide
   - Pas de titres (## etc.), juste des paragraphes
5. Si l'original mentionne explicitement des sources (hadith, asbāb), tu peux les citer brièvement entre parenthèses.

Réponds UNIQUEMENT avec le texte FR condensé. Pas de préambule, pas de méta-commentaire.`;

function isEnglishFile(md: string): boolean {
  // Détecte par le footer ajouté par fetch-surah-intros.ts
  return /Source : [^*]+\(anglais à traduire\)/.test(md);
}

function extractTitleAndBody(md: string): { title: string; body: string } | null {
  const titleMatch = md.match(/^# (.+?)$/m);
  if (!titleMatch) return null;
  const title = titleMatch[1]!.trim();
  // Corps = entre le titre et le footer "---" final
  const body = md
    .replace(/^# .+?\n+/, "")
    .replace(/\n+---\n+\*Source[\s\S]*$/, "")
    .trim();
  return { title, body };
}

function formatTranslated(title: string, fr: string): string {
  return (
    `# ${title}\n\n` +
    fr.trim() +
    `\n\n---\n\n` +
    `*Source : Maududi (Quran.com), traduit + condensé par Claude Haiku 4.5 via Vercel AI Gateway. À éditer librement avant \`npm run seed:intros\`.*\n`
  );
}

async function translate(title: string, body: string): Promise<string> {
  const { text } = await generateText({
    model: MODEL,
    system: SYSTEM_PROMPT,
    prompt: `Sourate concernée : ${title}\n\nTexte original (anglais) :\n\n${body}`,
    temperature: 0.3,
  });
  return text.trim();
}

async function main() {
  const files = (await fs.readdir(SOURCE_DIR)).filter((f) => /^\d+\.md$/.test(f));

  const onlyEnv = process.env.TRANSLATE_ONLY;
  const only = onlyEnv ? new Set(onlyEnv.split(",").map(Number)) : null;
  const force = process.env.TRANSLATE_FORCE === "1";

  const todo: { id: number; file: string }[] = [];
  for (const f of files) {
    const id = Number(f.replace(".md", ""));
    if (only && !only.has(id)) continue;
    const md = await fs.readFile(path.join(SOURCE_DIR, f), "utf-8");
    if (!force && !isEnglishFile(md)) continue;
    todo.push({ id, file: f });
  }

  console.log(`À traduire : ${todo.length} sourates`);
  if (todo.length === 0) {
    console.log("✓ Rien à faire (toutes en FR ou hors filtre).");
    return;
  }

  let ok = 0;
  let fail = 0;

  for (const { id, file } of todo) {
    const fullPath = path.join(SOURCE_DIR, file);
    process.stdout.write(`  ${id}. `);
    try {
      const md = await fs.readFile(fullPath, "utf-8");
      const parts = extractTitleAndBody(md);
      if (!parts) {
        console.log("✗ format invalide");
        fail++;
        continue;
      }
      const fr = await translate(parts.title, parts.body);
      const out = formatTranslated(parts.title, fr);
      await fs.writeFile(fullPath, out);
      console.log(`✓ ${parts.title} (${fr.length} chars)`);
      ok++;
    } catch (err) {
      console.log(`✗ ${(err as Error).message}`);
      fail++;
    }
  }

  console.log(`\n✓ ${ok} traduites, ${fail} échecs`);
  console.log(`Prochaine étape : npm run seed:intros`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
