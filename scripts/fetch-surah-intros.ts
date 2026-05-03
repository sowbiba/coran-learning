/**
 * Récupère les intros de sourate depuis Wikipédia FR (en priorité)
 * et Quran.com EN (fallback). Écrit un fichier markdown par sourate
 * dans `data/surah-intros/{N}.md`.
 *
 * Pas de tokens LLM — purs appels HTTP. Tu peux le lancer en parallèle.
 *
 * Usage :
 *   npm run fetch:intros                   # toutes les sourates manquantes
 *   FETCH_FORCE=1 npm run fetch:intros     # re-fetch même celles déjà présentes
 *   FETCH_ONLY=78,79,80 npm run fetch:intros  # cible
 *
 * Sources tentées dans l'ordre :
 *   1. Wikipédia FR (article de la sourate, intro plain text)
 *   2. Quran.com /chapters/{n}/info  (Maududi, anglais — fallback)
 *
 * Le fichier MD inclut l'attribution + la source en bas, pour que tu
 * puisses re-traduire / réécrire avant le seed sans perdre la trace.
 *
 * Une fois les .md là, lance `npm run seed:intros` pour les pousser en DB.
 */

import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve(process.cwd(), "data/surah-intros");

// ──────────────────────────────────────────────────────────────
// Mapping sourate → noms (FR translit + nom français commun)
// Réutilise la même structure que `lib/content/surah-meta.ts`,
// dupliquée ici pour rester autonome (le script tourne sans la DB).
// ──────────────────────────────────────────────────────────────

type SurahMeta = { id: number; translit: string; nameFr: string };

const SURAHS: SurahMeta[] = [
  { id: 1, translit: "Al-Fātiḥa", nameFr: "L'ouverture" },
  { id: 2, translit: "Al-Baqara", nameFr: "La vache" },
  { id: 3, translit: "Āl-ʿImrān", nameFr: "La famille d'Imran" },
  { id: 4, translit: "An-Nisāʾ", nameFr: "Les femmes" },
  { id: 5, translit: "Al-Māʾida", nameFr: "La table servie" },
  { id: 6, translit: "Al-Anʿām", nameFr: "Les bestiaux" },
  { id: 7, translit: "Al-Aʿrāf", nameFr: "Les redans" },
  { id: 8, translit: "Al-Anfāl", nameFr: "Le butin" },
  { id: 9, translit: "At-Tawba", nameFr: "Le repentir" },
  { id: 10, translit: "Yūnus", nameFr: "Jonas" },
  { id: 11, translit: "Hūd", nameFr: "Hud" },
  { id: 12, translit: "Yūsuf", nameFr: "Joseph" },
  { id: 13, translit: "Ar-Raʿd", nameFr: "Le tonnerre" },
  { id: 14, translit: "Ibrāhīm", nameFr: "Abraham" },
  { id: 15, translit: "Al-Ḥijr", nameFr: "Al-Hijr" },
  { id: 16, translit: "An-Naḥl", nameFr: "Les abeilles" },
  { id: 17, translit: "Al-Isrāʾ", nameFr: "Le voyage nocturne" },
  { id: 18, translit: "Al-Kahf", nameFr: "La caverne" },
  { id: 19, translit: "Maryam", nameFr: "Marie" },
  { id: 20, translit: "Ṭā-Hā", nameFr: "Ta-Ha" },
  { id: 21, translit: "Al-Anbiyāʾ", nameFr: "Les prophètes" },
  { id: 22, translit: "Al-Ḥajj", nameFr: "Le pèlerinage" },
  { id: 23, translit: "Al-Muʾminūn", nameFr: "Les croyants" },
  { id: 24, translit: "An-Nūr", nameFr: "La lumière" },
  { id: 25, translit: "Al-Furqān", nameFr: "Le discernement" },
  { id: 26, translit: "Ash-Shuʿarāʾ", nameFr: "Les poètes" },
  { id: 27, translit: "An-Naml", nameFr: "Les fourmis" },
  { id: 28, translit: "Al-Qaṣaṣ", nameFr: "Le récit" },
  { id: 29, translit: "Al-ʿAnkabūt", nameFr: "L'araignée" },
  { id: 30, translit: "Ar-Rūm", nameFr: "Les Romains" },
  { id: 31, translit: "Luqmān", nameFr: "Luqman" },
  { id: 32, translit: "As-Sajda", nameFr: "La prosternation" },
  { id: 33, translit: "Al-Aḥzāb", nameFr: "Les coalisés" },
  { id: 34, translit: "Sabaʾ", nameFr: "Saba" },
  { id: 35, translit: "Fāṭir", nameFr: "Le Créateur" },
  { id: 36, translit: "Yā-Sīn", nameFr: "Yâ-Sîn" },
  { id: 37, translit: "Aṣ-Ṣāffāt", nameFr: "Les rangés" },
  { id: 38, translit: "Ṣād", nameFr: "Sad" },
  { id: 39, translit: "Az-Zumar", nameFr: "Les groupes" },
  { id: 40, translit: "Ghāfir", nameFr: "Le pardonneur" },
  { id: 41, translit: "Fuṣṣilat", nameFr: "Les versets détaillés" },
  { id: 42, translit: "Ash-Shūrā", nameFr: "La consultation" },
  { id: 43, translit: "Az-Zukhruf", nameFr: "L'ornement" },
  { id: 44, translit: "Ad-Dukhān", nameFr: "La fumée" },
  { id: 45, translit: "Al-Jāthiya", nameFr: "L'agenouillée" },
  { id: 46, translit: "Al-Aḥqāf", nameFr: "Les dunes" },
  { id: 47, translit: "Muḥammad", nameFr: "Muhammad" },
  { id: 48, translit: "Al-Fatḥ", nameFr: "La victoire éclatante" },
  { id: 49, translit: "Al-Ḥujurāt", nameFr: "Les appartements" },
  { id: 50, translit: "Qāf", nameFr: "Qaf" },
  { id: 51, translit: "Adh-Dhāriyāt", nameFr: "Qui éparpillent" },
  { id: 52, translit: "Aṭ-Ṭūr", nameFr: "Le mont" },
  { id: 53, translit: "An-Najm", nameFr: "L'étoile" },
  { id: 54, translit: "Al-Qamar", nameFr: "La lune" },
  { id: 55, translit: "Ar-Raḥmān", nameFr: "Le Tout Miséricordieux" },
  { id: 56, translit: "Al-Wāqiʿa", nameFr: "L'événement" },
  { id: 57, translit: "Al-Ḥadīd", nameFr: "Le fer" },
  { id: 58, translit: "Al-Mujādila", nameFr: "La discussion" },
  { id: 59, translit: "Al-Ḥashr", nameFr: "L'exode" },
  { id: 60, translit: "Al-Mumtaḥana", nameFr: "L'éprouvée" },
  { id: 61, translit: "Aṣ-Ṣaff", nameFr: "Le rang" },
  { id: 62, translit: "Al-Jumuʿa", nameFr: "Le vendredi" },
  { id: 63, translit: "Al-Munāfiqūn", nameFr: "Les hypocrites" },
  { id: 64, translit: "At-Taghābun", nameFr: "La grande perte" },
  { id: 65, translit: "Aṭ-Ṭalāq", nameFr: "Le divorce" },
  { id: 66, translit: "At-Taḥrīm", nameFr: "L'interdiction" },
  { id: 67, translit: "Al-Mulk", nameFr: "La royauté" },
  { id: 68, translit: "Al-Qalam", nameFr: "La plume" },
  { id: 69, translit: "Al-Ḥāqqa", nameFr: "Celle qui montre la vérité" },
  { id: 70, translit: "Al-Maʿārij", nameFr: "Les voies d'ascension" },
  { id: 71, translit: "Nūḥ", nameFr: "Noé" },
  { id: 72, translit: "Al-Jinn", nameFr: "Les djinns" },
  { id: 73, translit: "Al-Muzzammil", nameFr: "L'enveloppé" },
  { id: 74, translit: "Al-Muddaththir", nameFr: "Le revêtu d'un manteau" },
  { id: 75, translit: "Al-Qiyāma", nameFr: "La résurrection" },
  { id: 76, translit: "Al-Insān", nameFr: "L'homme" },
  { id: 77, translit: "Al-Mursalāt", nameFr: "Les envoyés" },
  { id: 78, translit: "An-Nabaʾ", nameFr: "La grande nouvelle" },
  { id: 79, translit: "An-Nāziʿāt", nameFr: "Les anges qui arrachent les âmes" },
  { id: 80, translit: "ʿAbasa", nameFr: "Il s'est renfrogné" },
  { id: 81, translit: "At-Takwīr", nameFr: "L'obscurcissement" },
  { id: 82, translit: "Al-Infiṭār", nameFr: "La rupture" },
  { id: 83, translit: "Al-Muṭaffifīn", nameFr: "Les fraudeurs" },
  { id: 84, translit: "Al-Inshiqāq", nameFr: "La déchirure" },
  { id: 85, translit: "Al-Burūj", nameFr: "Les constellations" },
  { id: 86, translit: "Aṭ-Ṭāriq", nameFr: "L'astre nocturne" },
  { id: 87, translit: "Al-Aʿlā", nameFr: "Le Très-Haut" },
  { id: 88, translit: "Al-Ghāshiya", nameFr: "L'enveloppante" },
  { id: 89, translit: "Al-Fajr", nameFr: "L'aube" },
  { id: 90, translit: "Al-Balad", nameFr: "La cité" },
  { id: 91, translit: "Ash-Shams", nameFr: "Le soleil" },
  { id: 92, translit: "Al-Layl", nameFr: "La nuit" },
  { id: 93, translit: "Aḍ-Ḍuḥā", nameFr: "Le jour montant" },
  { id: 94, translit: "Ash-Sharḥ", nameFr: "L'ouverture" },
  { id: 95, translit: "At-Tīn", nameFr: "Le figuier" },
  { id: 96, translit: "Al-ʿAlaq", nameFr: "L'adhérence" },
  { id: 97, translit: "Al-Qadr", nameFr: "La destinée" },
  { id: 98, translit: "Al-Bayyina", nameFr: "La preuve" },
  { id: 99, translit: "Az-Zalzala", nameFr: "La secousse" },
  { id: 100, translit: "Al-ʿĀdiyāt", nameFr: "Les coursiers" },
  { id: 101, translit: "Al-Qāriʿa", nameFr: "Le fracas" },
  { id: 102, translit: "At-Takāthur", nameFr: "La course aux richesses" },
  { id: 103, translit: "Al-ʿAṣr", nameFr: "Le temps" },
  { id: 104, translit: "Al-Humaza", nameFr: "Les calomniateurs" },
  { id: 105, translit: "Al-Fīl", nameFr: "L'éléphant" },
  { id: 106, translit: "Quraysh", nameFr: "Qoraïch" },
  { id: 107, translit: "Al-Māʿūn", nameFr: "L'ustensile" },
  { id: 108, translit: "Al-Kawthar", nameFr: "L'abondance" },
  { id: 109, translit: "Al-Kāfirūn", nameFr: "Les mécréants" },
  { id: 110, translit: "An-Naṣr", nameFr: "Les secours" },
  { id: 111, translit: "Al-Masad", nameFr: "Les fibres" },
  { id: 112, translit: "Al-Ikhlāṣ", nameFr: "Le monothéisme pur" },
  { id: 113, translit: "Al-Falaq", nameFr: "L'aube naissante" },
  { id: 114, translit: "An-Nās", nameFr: "Les hommes" },
];

/** Strip diacritics + transliteration marks pour générer un slug Wikipedia. */
function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ʾʿ']/g, "")
    .replace(/ḍ|ḥ|ṣ|ṭ|ẓ/g, (c) => ({ ḍ: "d", ḥ: "h", ṣ: "s", ṭ: "t", ẓ: "z" }[c]!))
    .replace(/ā|ē|ī|ō|ū/g, (c) => ({ ā: "a", ē: "e", ī: "i", ō: "o", ū: "u" }[c]!));
}

/** Génère plusieurs candidats de titre Wikipédia, ordre de préférence. */
function wikipediaCandidates(meta: SurahMeta): string[] {
  const base = stripDiacritics(meta.translit);
  return [base, `Sourate ${base}`, `Sourate Al-${base.replace(/^Al-/, "")}`];
}

type WikiResponse = {
  query?: { pages?: Record<string, { extract?: string; missing?: string }> };
};

async function fetchWikipediaIntro(meta: SurahMeta): Promise<string | null> {
  for (const title of wikipediaCandidates(meta)) {
    const url =
      "https://fr.wikipedia.org/w/api.php" +
      "?action=query&prop=extracts&exintro=true&explaintext=true" +
      "&format=json&redirects=1&titles=" +
      encodeURIComponent(title);
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = (await res.json()) as WikiResponse;
      const pages = data.query?.pages ?? {};
      const first = Object.values(pages)[0];
      if (!first || first.missing !== undefined) continue;
      const extract = (first.extract ?? "").trim();
      // Skip pages d'homonymie ou trop courtes
      if (extract.length < 80) continue;
      if (extract.toLowerCase().includes("peut désigner")) continue;
      return extract;
    } catch {
      // continue avec le candidat suivant
    }
  }
  return null;
}

type QuranInfoResponse = {
  chapter_info?: {
    text?: string;
    short_text?: string;
    source?: string;
    language_name?: string;
  };
};

/** Convertit le HTML basique de Quran.com en plain text. */
function htmlToPlain(html: string): string {
  return html
    .replace(/<h2>/g, "\n\n## ")
    .replace(/<\/h2>/g, "\n")
    .replace(/<\/p>/g, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchQuranComIntro(
  meta: SurahMeta,
): Promise<{ text: string; source: string } | null> {
  try {
    const res = await fetch(
      `https://api.quran.com/api/v4/chapters/${meta.id}/info?language=fr`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as QuranInfoResponse;
    if (!data.chapter_info?.text) return null;
    return {
      text: htmlToPlain(data.chapter_info.text),
      source: data.chapter_info.source ?? "Quran.com",
    };
  } catch {
    return null;
  }
}

function formatMd(
  meta: SurahMeta,
  body: string,
  source: string,
  language: "fr" | "en",
): string {
  const langLabel = language === "fr" ? "français" : "anglais (à traduire)";
  return (
    `# ${meta.id}. ${meta.translit} — ${meta.nameFr}\n\n` +
    body.trim() +
    `\n\n---\n\n` +
    `*Source : ${source} (${langLabel}). À éditer librement avant \`npm run seed:intros\`.*\n`
  );
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const existing = new Set(
    (await fs.readdir(OUTPUT_DIR))
      .filter((f) => /^\d+\.md$/.test(f))
      .map((f) => Number(f.replace(".md", ""))),
  );

  const force = process.env.FETCH_FORCE === "1";
  const onlyEnv = process.env.FETCH_ONLY;
  const only = onlyEnv ? new Set(onlyEnv.split(",").map(Number)) : null;

  const todo = SURAHS.filter((s) => {
    if (only && !only.has(s.id)) return false;
    if (!force && existing.has(s.id)) return false;
    return true;
  });

  console.log(`À fetcher : ${todo.length}/${SURAHS.length} sourates`);
  if (todo.length === 0) {
    console.log("✓ Rien à faire. (FETCH_FORCE=1 pour re-fetch.)");
    return;
  }

  let fr = 0;
  let en = 0;
  let fail = 0;

  for (const meta of todo) {
    process.stdout.write(`  ${meta.id}. ${meta.translit} ... `);
    let body: string | null = null;
    let source = "Wikipédia FR";
    let language: "fr" | "en" = "fr";

    body = await fetchWikipediaIntro(meta);

    if (!body) {
      const qc = await fetchQuranComIntro(meta);
      if (qc) {
        body = qc.text;
        source = qc.source;
        language = "en";
      }
    }

    if (!body) {
      console.log("✗ aucune source");
      fail++;
      continue;
    }

    const md = formatMd(meta, body, source, language);
    await fs.writeFile(path.join(OUTPUT_DIR, `${meta.id}.md`), md);
    console.log(`✓ ${language === "fr" ? "FR" : "EN"} (${body.length} chars)`);
    if (language === "fr") fr++;
    else en++;
  }

  console.log(`\n✓ ${fr} en français + ${en} en anglais ; ${fail} sans source`);
  console.log(`Prochaine étape : npm run seed:intros`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
