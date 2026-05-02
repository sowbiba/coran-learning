/**
 * Métadonnées francophones pour les sourates.
 *
 * `name_fr` : nom français usuel (Hamidullah / Complexe Roi Fahd).
 * `name_translit` : translittération latine standard (avec diacritiques).
 *
 * Couvre Al-Fātiḥa (1) + Juz' 30 (78–114) pour le v1. À étendre quand on
 * ingère les autres juz' en v2.
 */

export type SurahMeta = {
  name_fr: string;
  name_translit: string;
};

export const SURAH_META: Record<number, SurahMeta> = {
  1: { name_fr: "L'Ouverture", name_translit: "Al-Fātiḥa" },

  // Juz' 30
  78: { name_fr: "La Grande Nouvelle", name_translit: "An-Nabaʾ" },
  79: { name_fr: "Les Anges qui arrachent", name_translit: "An-Nāziʿāt" },
  80: { name_fr: "Il S'est renfrogné", name_translit: "ʿAbasa" },
  81: { name_fr: "L'Obscurcissement", name_translit: "At-Takwīr" },
  82: { name_fr: "La Rupture", name_translit: "Al-Infiṭār" },
  83: { name_fr: "Les Fraudeurs", name_translit: "Al-Muṭaffifīn" },
  84: { name_fr: "La Déchirure", name_translit: "Al-Inshiqāq" },
  85: { name_fr: "Les Constellations", name_translit: "Al-Burūj" },
  86: { name_fr: "L'Astre nocturne", name_translit: "At-Ṭāriq" },
  87: { name_fr: "Le Très-Haut", name_translit: "Al-Aʿlā" },
  88: { name_fr: "L'Enveloppante", name_translit: "Al-Ghāshiya" },
  89: { name_fr: "L'Aube", name_translit: "Al-Fajr" },
  90: { name_fr: "La Cité", name_translit: "Al-Balad" },
  91: { name_fr: "Le Soleil", name_translit: "Ash-Shams" },
  92: { name_fr: "La Nuit", name_translit: "Al-Layl" },
  93: { name_fr: "Le Jour montant", name_translit: "Aḍ-Ḍuḥā" },
  94: { name_fr: "L'Ouverture (de la poitrine)", name_translit: "Ash-Sharḥ" },
  95: { name_fr: "Le Figuier", name_translit: "At-Tīn" },
  96: { name_fr: "L'Adhérence", name_translit: "Al-ʿAlaq" },
  97: { name_fr: "La Destinée", name_translit: "Al-Qadr" },
  98: { name_fr: "La Preuve", name_translit: "Al-Bayyina" },
  99: { name_fr: "La Secousse", name_translit: "Az-Zalzala" },
  100: { name_fr: "Les Coursiers", name_translit: "Al-ʿĀdiyāt" },
  101: { name_fr: "Le Fracas", name_translit: "Al-Qāriʿa" },
  102: { name_fr: "La Course aux richesses", name_translit: "At-Takāthur" },
  103: { name_fr: "Le Temps", name_translit: "Al-ʿAṣr" },
  104: { name_fr: "Les Calomniateurs", name_translit: "Al-Humaza" },
  105: { name_fr: "L'Éléphant", name_translit: "Al-Fīl" },
  106: { name_fr: "Quraïsh", name_translit: "Quraysh" },
  107: { name_fr: "L'Ustensile", name_translit: "Al-Māʿūn" },
  108: { name_fr: "L'Abondance", name_translit: "Al-Kawthar" },
  109: { name_fr: "Les Mécréants", name_translit: "Al-Kāfirūn" },
  110: { name_fr: "Les Secours", name_translit: "An-Naṣr" },
  111: { name_fr: "Les Fibres", name_translit: "Al-Masad" },
  112: { name_fr: "Le Monothéisme pur", name_translit: "Al-Ikhlāṣ" },
  113: { name_fr: "L'Aube naissante", name_translit: "Al-Falaq" },
  114: { name_fr: "Les Hommes", name_translit: "An-Nās" },
};

/** Liste des sourates ingérées en v1 : Al-Fātiḥa + Juz' 30. */
export const V1_SURAHS = [1, ...range(78, 114)] as const;

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
}
