/**
 * Métadonnées francophones pour les 114 sourates.
 *
 * `name_fr`        : nom français usuel (Hamidullah / Complexe Roi Fahd).
 * `name_translit`  : translittération latine standard (avec diacritiques).
 *
 * Couvre les 114 sourates du Coran complet. Pour la v1 on a commencé
 * par Al-Fātiḥa + Juz' 30 ; le script `ingest-quran.ts` accepte
 * désormais ALL_SURAHS pour tout ingérer.
 */

export type SurahMeta = {
  name_fr: string;
  name_translit: string;
};

export const SURAH_META: Record<number, SurahMeta> = {
  1: { name_fr: "L'Ouverture", name_translit: "Al-Fātiḥa" },
  2: { name_fr: "La Vache", name_translit: "Al-Baqara" },
  3: { name_fr: "La Famille d'Imran", name_translit: "Āl ʿImrān" },
  4: { name_fr: "Les Femmes", name_translit: "An-Nisāʾ" },
  5: { name_fr: "La Table Servie", name_translit: "Al-Māʾida" },
  6: { name_fr: "Les Bestiaux", name_translit: "Al-Anʿām" },
  7: { name_fr: "Les Murailles", name_translit: "Al-Aʿrāf" },
  8: { name_fr: "Le Butin", name_translit: "Al-Anfāl" },
  9: { name_fr: "Le Repentir", name_translit: "At-Tawba" },
  10: { name_fr: "Jonas", name_translit: "Yūnus" },
  11: { name_fr: "Hud", name_translit: "Hūd" },
  12: { name_fr: "Joseph", name_translit: "Yūsuf" },
  13: { name_fr: "Le Tonnerre", name_translit: "Ar-Raʿd" },
  14: { name_fr: "Abraham", name_translit: "Ibrāhīm" },
  15: { name_fr: "Al-Hijr", name_translit: "Al-Ḥijr" },
  16: { name_fr: "Les Abeilles", name_translit: "An-Naḥl" },
  17: { name_fr: "Le Voyage Nocturne", name_translit: "Al-Isrāʾ" },
  18: { name_fr: "La Caverne", name_translit: "Al-Kahf" },
  19: { name_fr: "Marie", name_translit: "Maryam" },
  20: { name_fr: "Ta-Ha", name_translit: "Ṭā Hā" },
  21: { name_fr: "Les Prophètes", name_translit: "Al-Anbiyāʾ" },
  22: { name_fr: "Le Pèlerinage", name_translit: "Al-Ḥajj" },
  23: { name_fr: "Les Croyants", name_translit: "Al-Muʾminūn" },
  24: { name_fr: "La Lumière", name_translit: "An-Nūr" },
  25: { name_fr: "Le Discernement", name_translit: "Al-Furqān" },
  26: { name_fr: "Les Poètes", name_translit: "Ash-Shuʿarāʾ" },
  27: { name_fr: "Les Fourmis", name_translit: "An-Naml" },
  28: { name_fr: "Le Récit", name_translit: "Al-Qaṣaṣ" },
  29: { name_fr: "L'Araignée", name_translit: "Al-ʿAnkabūt" },
  30: { name_fr: "Les Romains", name_translit: "Ar-Rūm" },
  31: { name_fr: "Luqman", name_translit: "Luqmān" },
  32: { name_fr: "La Prosternation", name_translit: "As-Sajda" },
  33: { name_fr: "Les Coalisés", name_translit: "Al-Aḥzāb" },
  34: { name_fr: "Saba", name_translit: "Sabaʾ" },
  35: { name_fr: "Le Créateur", name_translit: "Fāṭir" },
  36: { name_fr: "Yā-Sīn", name_translit: "Yā-Sīn" },
  37: { name_fr: "Les Rangés", name_translit: "Aṣ-Ṣāffāt" },
  38: { name_fr: "Sad", name_translit: "Ṣād" },
  39: { name_fr: "Les Groupes", name_translit: "Az-Zumar" },
  40: { name_fr: "Le Pardonneur", name_translit: "Ghāfir" },
  41: { name_fr: "Les Versets Détaillés", name_translit: "Fuṣṣilat" },
  42: { name_fr: "La Consultation", name_translit: "Ash-Shūrā" },
  43: { name_fr: "L'Ornement", name_translit: "Az-Zukhruf" },
  44: { name_fr: "La Fumée", name_translit: "Ad-Dukhān" },
  45: { name_fr: "L'Agenouillée", name_translit: "Al-Jāthiya" },
  46: { name_fr: "Les Dunes", name_translit: "Al-Aḥqāf" },
  47: { name_fr: "Muhammad", name_translit: "Muḥammad" },
  48: { name_fr: "La Victoire", name_translit: "Al-Fatḥ" },
  49: { name_fr: "Les Appartements", name_translit: "Al-Ḥujurāt" },
  50: { name_fr: "Qaf", name_translit: "Qāf" },
  51: { name_fr: "Qui Éparpillent", name_translit: "Adh-Dhāriyāt" },
  52: { name_fr: "Le Mont", name_translit: "Aṭ-Ṭūr" },
  53: { name_fr: "L'Étoile", name_translit: "An-Najm" },
  54: { name_fr: "La Lune", name_translit: "Al-Qamar" },
  55: { name_fr: "Le Tout Miséricordieux", name_translit: "Ar-Raḥmān" },
  56: { name_fr: "L'Événement", name_translit: "Al-Wāqiʿa" },
  57: { name_fr: "Le Fer", name_translit: "Al-Ḥadīd" },
  58: { name_fr: "La Discussion", name_translit: "Al-Mujādila" },
  59: { name_fr: "L'Exode", name_translit: "Al-Ḥashr" },
  60: { name_fr: "L'Éprouvée", name_translit: "Al-Mumtaḥina" },
  61: { name_fr: "Le Rang", name_translit: "Aṣ-Ṣaff" },
  62: { name_fr: "Le Vendredi", name_translit: "Al-Jumuʿa" },
  63: { name_fr: "Les Hypocrites", name_translit: "Al-Munāfiqūn" },
  64: { name_fr: "La Grande Perte", name_translit: "At-Taghābun" },
  65: { name_fr: "Le Divorce", name_translit: "Aṭ-Ṭalāq" },
  66: { name_fr: "L'Interdiction", name_translit: "At-Taḥrīm" },
  67: { name_fr: "La Royauté", name_translit: "Al-Mulk" },
  68: { name_fr: "La Plume", name_translit: "Al-Qalam" },
  69: { name_fr: "Celle qui Montre la Vérité", name_translit: "Al-Ḥāqqa" },
  70: { name_fr: "Les Voies d'Ascension", name_translit: "Al-Maʿārij" },
  71: { name_fr: "Noé", name_translit: "Nūḥ" },
  72: { name_fr: "Les Djinns", name_translit: "Al-Jinn" },
  73: { name_fr: "L'Enveloppé", name_translit: "Al-Muzzammil" },
  74: { name_fr: "Le Revêtu d'un Manteau", name_translit: "Al-Muddaththir" },
  75: { name_fr: "La Résurrection", name_translit: "Al-Qiyāma" },
  76: { name_fr: "L'Homme", name_translit: "Al-Insān" },
  77: { name_fr: "Les Envoyés", name_translit: "Al-Mursalāt" },

  // Juz' 30 (déjà en DB)
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

/** Toutes les sourates (1-114) pour ingestion full-Coran. */
export const ALL_SURAHS = range(1, 114);

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
}
