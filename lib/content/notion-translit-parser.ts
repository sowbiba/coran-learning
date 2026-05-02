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
 * Tolère :
 *  - le contenu décodé (newlines réels, guillemets normaux)
 *  - le contenu JSON-encoded (`\n` littéraux, `\"` littéraux) — utile
 *    quand on sauvegarde le résultat brut du MCP sans le déserialiser
 *  - les blocs incomplets (verset sans translit) — silencieusement skip
 */

export type ParsedVerse = { numberInSurah: number; translit: string };

export function parseNotionSurahPage(raw: string): ParsedVerse[] {
  // Normalise : si le contenu vient d'un export JSON brut, on remet les
  // newlines et guillemets dans leur forme réelle.
  const normalized = raw.replace(/\\"/g, '"').replace(/\\n/g, "\n");

  const verses: ParsedVerse[] = [];
  const blocks = normalized.split(/^\s*-{3,}\s*$/m);

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
