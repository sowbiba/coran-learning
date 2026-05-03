/**
 * Détection et extraction de la Basmala (بسم الله الرحمن الرحيم).
 *
 * L'API alquran.cloud préfixe la Basmala dans le texte du verset 1
 * de chaque sourate, sauf :
 *  - sourate 1 (Al-Fātiḥa) où elle EST le verset 1
 *  - sourate 9 (At-Tawba) qui n'a pas de Basmala
 *
 * On veut l'afficher séparément (en en-tête de la sourate) pour toutes
 * les autres sourates, plutôt que collée au début du verset 1.
 */

export const BISMILLAH_DISPLAY = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

/** Sourates où la Basmala doit être affichée séparément (toutes sauf 1 et 9). */
export function shouldDisplaySeparateBismillah(surahId: number): boolean {
  return surahId !== 1 && surahId !== 9;
}

/**
 * Tente de retirer la Basmala du début d'un texte de verset 1.
 *
 * Approche : matche le motif structurel "Bismi Allahi ar-Rahmani ar-Rahimi"
 * en tolérant tous les diacritiques (fatha, kasra, shadda, sukun…), les
 * variantes de la lettre alif (ا / ٱ hamzatul-wasl) et du yāʾ (ي / ی persan,
 * utilisé dans certaines polices Uthmani).
 *
 * Retourne le texte original si le pattern ne matche pas (garde-fou contre
 * un strip catastrophique).
 */
export function stripBismillah(text: string): string {
  // Diacritiques arabes + marques quraniques (small high yāʾ, sukun, etc.)
  // + tatweel (ـ U+0640) utilisé entre lettres dans certaines polices
  const marks = "[\\u0610-\\u061A\\u0640\\u064B-\\u065F\\u0670\\u06D6-\\u06ED]";
  // Variantes alif et yāʾ acceptées dans les textes Uthmani
  const alif = "[ٱا]";
  const yaa = "[يیى]";

  const bismillah = new RegExp(
    "^\\s*" +
    `ب${marks}*\\s*س${marks}*\\s*م${marks}*\\s+` +
    `${alif}${marks}*\\s*ل${marks}*\\s*ل${marks}*\\s*ه${marks}*\\s+` +
    `${alif}${marks}*\\s*ل${marks}*\\s*ر${marks}*\\s*ح${marks}*\\s*م${marks}*\\s*ن${marks}*\\s+` +
    `${alif}${marks}*\\s*ل${marks}*\\s*ر${marks}*\\s*ح${marks}*\\s*${yaa}${marks}*\\s*م${marks}*` +
    "\\s*",
  );

  const stripped = text.replace(bismillah, "");
  // Si rien n'a été enlevé, le texte ne commençait pas par la Basmala.
  if (stripped === text) return text;
  // Garde-fou : si on a tout effacé (cas Al-Fātiḥa v1 où la Basmala EST le
  // verset), on retourne l'original.
  if (stripped.trim().length < 3) return text;
  return stripped;
}
