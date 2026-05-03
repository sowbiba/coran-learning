/**
 * Fetch des pages Notion de sourates → fichiers `data/notion-pages/{N}.txt`.
 *
 * Appelle directement l'API Notion (pas via le MCP), donc 0 token LLM.
 * Génère le format attendu par `parseNotionSurahPage` :
 *   ### <span color="purple">**Verset N**</span>
 *   <span color="blue">*translit*</span>
 *   ---
 *
 * Pré-requis :
 *   1. Créer une intégration Notion : https://www.notion.so/my-integrations
 *   2. Copier le token (commence par `secret_` ou `ntn_`) dans `.env.local` :
 *        NOTION_TOKEN=ntn_xxxxxxx
 *   3. Partager la page "Coran" (et toutes ses sous-pages) avec l'intégration :
 *        Sur la page Notion → ⋯ → Connections → ajouter votre intégration
 *
 * Usage :
 *   npm run fetch:notion           # fetch les sourates manquantes
 *   FETCH_FORCE=1 npm run fetch:notion   # re-fetch tout
 *   FETCH_ONLY=2,3,4 npm run fetch:notion   # fetch uniquement ces sourates
 */

import fs from "node:fs/promises";
import path from "node:path";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = "2022-06-28";
const CORAN_PAGE_ID = "323c28a133b7804f8202e5ac908c3d47";
const OUTPUT_DIR = path.resolve(process.cwd(), "data/notion-pages");

if (!NOTION_TOKEN) {
  console.error(
    "✗ NOTION_TOKEN manquant dans l'environnement.\n" +
      "  1. Créer une intégration : https://www.notion.so/my-integrations\n" +
      "  2. Ajouter NOTION_TOKEN=ntn_xxx dans .env.local\n" +
      "  3. Partager la page Coran avec l'intégration",
  );
  process.exit(1);
}

type RichText = {
  plain_text: string;
  annotations: { color: string; italic: boolean; bold: boolean };
};

type Block = {
  id: string;
  type: string;
  has_children: boolean;
  child_page?: { title: string };
  heading_3?: { rich_text: RichText[] };
  paragraph?: { rich_text: RichText[] };
};

type ListResponse = {
  results: Block[];
  has_more: boolean;
  next_cursor: string | null;
};

async function notionFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion ${res.status} ${url}: ${body}`);
  }
  return res.json() as Promise<T>;
}

async function listAllChildren(blockId: string): Promise<Block[]> {
  const all: Block[] = [];
  let cursor: string | null = null;
  do {
    const url =
      `https://api.notion.com/v1/blocks/${blockId}/children?page_size=100` +
      (cursor ? `&start_cursor=${cursor}` : "");
    const page: ListResponse = await notionFetch<ListResponse>(url);
    all.push(...page.results);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return all;
}

/** Concatène le plain_text de tous les segments rich_text. */
function joinText(rt: RichText[] | undefined): string {
  if (!rt) return "";
  return rt.map((r) => r.plain_text).join("");
}

/** Extrait les paires { numberInSurah, translit } d'une sourate. */
function extractVerses(blocks: Block[]): { n: number; translit: string }[] {
  const verses: { n: number; translit: string }[] = [];
  let currentVerse: number | null = null;

  for (const b of blocks) {
    // Heading_3 "Verset N" en violet
    if (b.type === "heading_3" && b.heading_3) {
      const text = joinText(b.heading_3.rich_text);
      const match = text.match(/Verset\s+(\d+)/);
      if (match) {
        currentVerse = Number(match[1]);
      }
      continue;
    }

    // Paragraph avec rich_text bleu italique = translit
    if (b.type === "paragraph" && b.paragraph && currentVerse !== null) {
      // Cherche le premier segment bleu italique
      const blueItalic = b.paragraph.rich_text.find(
        (r) => r.annotations.color === "blue" && r.annotations.italic,
      );
      if (blueItalic) {
        // Concatène tous les segments bleus de ce paragraphe (parfois la
        // translit est splittée en plusieurs runs avec des espaces)
        const translit = b.paragraph.rich_text
          .filter((r) => r.annotations.color === "blue")
          .map((r) => r.plain_text)
          .join("")
          .trim();
        if (translit) {
          verses.push({ n: currentVerse, translit });
          currentVerse = null; // évite de dupliquer
        }
      }
    }
  }

  return verses;
}

function formatSurahFile(verses: { n: number; translit: string }[]): string {
  return verses
    .sort((a, b) => a.n - b.n)
    .map(
      (v) =>
        `### <span color="purple">**Verset ${v.n}**</span>\n` +
        `<span color="blue">*${v.translit}*</span>\n` +
        `---`,
    )
    .join("\n") + "\n";
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const existing = new Set(
    (await fs.readdir(OUTPUT_DIR))
      .filter((f) => /^\d+\.txt$/.test(f))
      .map((f) => Number(f.replace(".txt", ""))),
  );

  const force = process.env.FETCH_FORCE === "1";
  const onlyEnv = process.env.FETCH_ONLY;
  const only = onlyEnv ? new Set(onlyEnv.split(",").map(Number)) : null;

  console.log(`Listing des sourates depuis la page Coran...`);
  const childPages = await listAllChildren(CORAN_PAGE_ID);

  const sourates: { id: string; n: number; title: string }[] = [];
  for (const b of childPages) {
    if (b.type !== "child_page" || !b.child_page) continue;
    const title = b.child_page.title;
    const m = title.match(/^(\d+)\./);
    if (!m) continue;
    const n = Number(m[1]);
    if (n < 1 || n > 114) continue;
    sourates.push({ id: b.id, n, title });
  }
  sourates.sort((a, b) => a.n - b.n);

  console.log(`Trouvé ${sourates.length}/114 sourates dans Notion.\n`);

  const todo = sourates.filter((s) => {
    if (only && !only.has(s.n)) return false;
    if (!force && existing.has(s.n)) return false;
    return true;
  });

  console.log(`À fetcher : ${todo.length}`);
  if (todo.length === 0) {
    console.log("✓ Rien à faire (utiliser FETCH_FORCE=1 pour re-fetch).");
    return;
  }

  let okCount = 0;
  let failCount = 0;

  for (const s of todo) {
    process.stdout.write(`  ${s.n}. ${s.title} ... `);
    try {
      const blocks = await listAllChildren(s.id);
      const verses = extractVerses(blocks);
      if (verses.length === 0) {
        console.log("✗ aucun verset extrait");
        failCount++;
        continue;
      }
      const content = formatSurahFile(verses);
      await fs.writeFile(path.join(OUTPUT_DIR, `${s.n}.txt`), content);
      console.log(`✓ ${verses.length} versets`);
      okCount++;
    } catch (err) {
      console.log(`✗ ${(err as Error).message}`);
      failCount++;
    }
  }

  console.log(
    `\n✓ Terminé : ${okCount} sourates ingérées, ${failCount} échecs.`,
  );
  console.log(`Prochaine étape : npm run ingest:notion`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
