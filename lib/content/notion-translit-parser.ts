/**
 * Parse une page Notion d'une sourate (au format enhanced markdown
 * retourné par le MCP Notion) et renvoie la liste de (verset, translit).
 *
 * Format attendu (un bloc par verset, séparés par `---`) :
 *   ### <span color="purple">**Verset N**</span>
 *   ## <span color="green">**<arabe>**</span>
 *   <span color="blue">*<translit latine en italique>*</span>
 *   <span color="brown"><traduction française></span>
 *
 * Tolérant aux blocs incomplets (verset sans translit, etc.) — on
 * skip silencieusement.
 */

export type ParsedVerse = { numberInSurah: number; translit: string };

export function parseNotionSurahPage(raw: string): ParsedVerse[] {
  const verses: ParsedVerse[] = [];
  const blocks = raw.split(/^---\s*$/m);

  for (const block of blocks) {
    const versetMatch = block.match(/Verset\s+(\d+)/);
    if (!versetMatch) continue;

    const translitMatch = block.match(
      /<span color="blue">\*([^*]+)\*<\/span>/,
    );
    if (!translitMatch) continue;

    verses.push({
      numberInSurah: Number(versetMatch[1]),
      translit: translitMatch[1]!.trim(),
    });
  }

  return verses;
}
