/**
 * Couche de requêtes DB pour le contenu coranique.
 *
 * Toutes ces fonctions tournent côté serveur (RSC ou Route Handlers).
 * Elles ne sont pas optimisées pour la haute concurrence — l'app est mono-
 * utilisateur. Lecture simple, joins explicites, types stricts.
 */

import "server-only";
import { and, asc, between, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  ayahs as ayahsTable,
  audioFiles,
  chunks as chunksTable,
  surahs as surahsTable,
  translations,
  transliterations,
  type Ayah,
  type Chunk,
  type Surah,
} from "@/lib/db/schema";
import { listNotesForAyahs } from "@/lib/notes/repo";
import {
  BISMILLAH_DISPLAY,
  shouldDisplaySeparateBismillah,
  stripBismillah,
} from "@/lib/content/bismillah";

const TRANSLATION_SOURCE = "hamidullah_complexe_roi_fahd";
const RECITER_DEFAULT = "husary_muallim_128";

// ──────────────────────────────────────────────────────────────
// Liste des chunks (leçons disponibles)
// ──────────────────────────────────────────────────────────────

export type ChunkWithSurah = Chunk & {
  surahNameAr: string;
  surahNameFr: string;
  surahNameTranslit: string;
  surahPeriod: "meccan" | "medinan";
  surahIntroFrMd: string | null;
};

/**
 * Renvoie tous les chunks ingérés, joints à leur sourate.
 * Ordre d'affichage : ordre traditionnel de Hifz pour le juz' 30 = on
 * commence par An-Nās (114) et on remonte. Les sourates ≤ 1 page sont
 * faciles à mémoriser une à une.
 */
export async function listChunks(): Promise<ChunkWithSurah[]> {
  const rows = await db
    .select({
      chunk: chunksTable,
      surah: surahsTable,
    })
    .from(chunksTable)
    .innerJoin(surahsTable, eq(chunksTable.surahId, surahsTable.id))
    .orderBy(desc(chunksTable.surahId), asc(chunksTable.orderIndex));

  return rows.map(({ chunk, surah }) => ({
    ...chunk,
    surahNameAr: surah.nameAr,
    surahNameFr: surah.nameFr,
    surahNameTranslit: surah.nameTranslit,
    surahPeriod: surah.period,
    surahIntroFrMd: surah.introFrMd,
  }));
}

// ──────────────────────────────────────────────────────────────
// Détail d'un chunk (pour /lesson, /practice, /recite)
// ──────────────────────────────────────────────────────────────

export type ChunkAyah = {
  id: number;
  numberInSurah: number;
  textUthmani: string;
  textImlaei: string | null;
  juz: number;
  page: number;
  hizb: number;
  /** Traduction française (Hamidullah). Peut être null si non encore ingérée. */
  textFr: string | null;
  /** Liste mots arabes + translit phonétique latine, si l'élève a saisi
   *  une translit pour ce verset (sinon null → l'UI génère ou n'affiche pas). */
  transliteration: { ar: string; latin: string }[] | null;
  /** URL audio Husary Muʿallim 128 kbps. */
  audioUrl: string | null;
  /** Note libre de l'élève sur ce verset (markdown). null si pas de note. */
  noteBodyMd: string | null;
};

export type ChunkDetails = {
  chunk: ChunkWithSurah;
  ayahs: ChunkAyah[];
  /**
   * Texte de la Basmala à afficher en en-tête, *uniquement* si ce chunk
   * inclut le verset 1 d'une sourate qui débute par une Basmala (i.e.
   * toutes sauf Al-Fātiḥa où elle EST le verset 1, et At-Tawba qui n'en
   * a pas). Le texte du verset 1 a alors été dépouillé de sa Basmala.
   */
  bismillah: string | null;
};

export async function getChunkDetails(
  chunkId: number,
  userId?: string,
): Promise<ChunkDetails | null> {
  const chunkRows = await db
    .select({ chunk: chunksTable, surah: surahsTable })
    .from(chunksTable)
    .innerJoin(surahsTable, eq(chunksTable.surahId, surahsTable.id))
    .where(eq(chunksTable.id, chunkId))
    .limit(1);

  if (chunkRows.length === 0) return null;
  const { chunk, surah } = chunkRows[0]!;

  // Récupérer tous les ayahs du chunk en une requête, joints aux traductions
  // et aux audios. Le LEFT JOIN sur transliterations ramène la translit perso
  // si l'élève en a une, sinon null.
  const ayahRows = await db
    .select({
      ayah: ayahsTable,
      translation: translations,
      audio: audioFiles,
      translit: transliterations,
    })
    .from(ayahsTable)
    .leftJoin(
      translations,
      and(
        eq(translations.ayahId, ayahsTable.id),
        eq(translations.source, TRANSLATION_SOURCE),
        eq(translations.lang, "fr"),
      ),
    )
    .leftJoin(
      audioFiles,
      and(
        eq(audioFiles.ayahId, ayahsTable.id),
        eq(audioFiles.reciter, RECITER_DEFAULT),
      ),
    )
    .leftJoin(transliterations, eq(transliterations.ayahId, ayahsTable.id))
    .where(between(ayahsTable.id, chunk.firstAyahId, chunk.lastAyahId))
    .orderBy(asc(ayahsTable.id));

  const notesByAyah = userId
    ? await listNotesForAyahs(
        userId,
        ayahRows.map((r) => r.ayah.id),
      )
    : new Map<number, { bodyMd: string }>();

  // Si le chunk inclut le verset 1 et que la sourate démarre par une
  // Basmala (toutes sauf 1 et 9), on l'extrait du texte du v1 pour
  // l'afficher séparément en en-tête.
  const includesV1 = ayahRows.some((r) => r.ayah.numberInSurah === 1);
  const showSeparate =
    includesV1 && shouldDisplaySeparateBismillah(chunk.surahId);

  const ayahs: ChunkAyah[] = ayahRows.map(({ ayah, translation, audio, translit }) => {
    const stripUthmani =
      showSeparate && ayah.numberInSurah === 1
        ? stripBismillah(ayah.textUthmani)
        : ayah.textUthmani;
    const stripImlaei =
      showSeparate && ayah.numberInSurah === 1 && ayah.textImlaei
        ? stripBismillah(ayah.textImlaei)
        : ayah.textImlaei;
    return {
      id: ayah.id,
      numberInSurah: ayah.numberInSurah,
      textUthmani: stripUthmani,
      textImlaei: stripImlaei,
      juz: ayah.juz,
      page: ayah.page,
      hizb: ayah.hizb,
      textFr: translation?.text ?? null,
      transliteration: translit?.wordsJson ?? null,
      audioUrl: audio?.url ?? null,
      noteBodyMd: notesByAyah.get(ayah.id)?.bodyMd ?? null,
    };
  });

  return {
    chunk: {
      ...chunk,
      surahNameAr: surah.nameAr,
      surahNameFr: surah.nameFr,
      surahNameTranslit: surah.nameTranslit,
      surahPeriod: surah.period,
      surahIntroFrMd: surah.introFrMd,
    },
    ayahs,
    bismillah: showSeparate ? BISMILLAH_DISPLAY : null,
  };
}

// ──────────────────────────────────────────────────────────────
// Métadonnées de sourate seule (pour sortir l'intro_fr_md, etc.)
// ──────────────────────────────────────────────────────────────

export async function getSurah(id: number): Promise<Surah | null> {
  const rows = await db
    .select()
    .from(surahsTable)
    .where(eq(surahsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// ──────────────────────────────────────────────────────────────
// Navigation entre chunks (prev / next dans l'ordre du muṣḥaf)
// ──────────────────────────────────────────────────────────────

export type ChunkNavLink = {
  id: number;
  label: string;
  surahNameTranslit: string;
};

/**
 * Trouve le chunk précédent et suivant dans l'ordre `orderIndex`. Utilisé
 * pour la navigation prev/next sur /lesson, /practice, /recite.
 */
export async function getAdjacentChunks(
  currentChunkId: number,
): Promise<{ prev: ChunkNavLink | null; next: ChunkNavLink | null }> {
  const current = await db
    .select({ orderIndex: chunksTable.orderIndex })
    .from(chunksTable)
    .where(eq(chunksTable.id, currentChunkId))
    .limit(1);

  if (current.length === 0) return { prev: null, next: null };
  const order = current[0]!.orderIndex;

  const [prev, next] = await Promise.all([
    db
      .select({
        id: chunksTable.id,
        label: chunksTable.label,
        surahNameTranslit: surahsTable.nameTranslit,
      })
      .from(chunksTable)
      .innerJoin(surahsTable, eq(chunksTable.surahId, surahsTable.id))
      .where(lt(chunksTable.orderIndex, order))
      .orderBy(desc(chunksTable.orderIndex))
      .limit(1),
    db
      .select({
        id: chunksTable.id,
        label: chunksTable.label,
        surahNameTranslit: surahsTable.nameTranslit,
      })
      .from(chunksTable)
      .innerJoin(surahsTable, eq(chunksTable.surahId, surahsTable.id))
      .where(gt(chunksTable.orderIndex, order))
      .orderBy(asc(chunksTable.orderIndex))
      .limit(1),
  ]);

  return {
    prev: prev[0] ?? null,
    next: next[0] ?? null,
  };
}

// ──────────────────────────────────────────────────────────────
// Helpers de présentation (pour /today)
// ──────────────────────────────────────────────────────────────

export function ayahRangeLabel(chunk: Chunk, surahAyahCount: number): string {
  // Pour un chunk de type 'surah' couvrant toute la sourate :
  if (chunk.kind === "surah" && chunk.ayahCount === surahAyahCount) {
    return `Versets 1 à ${chunk.ayahCount}`;
  }
  // Pour un rukūʿ : on a besoin du numberInSurah du 1er et dernier ayah du
  // chunk. À implémenter quand on ingèrera les longues sourates en v2.
  return `${chunk.ayahCount} versets`;
}

/** Type expose-only pour avoid leaking entire Ayah objects to client. */
export type { Ayah };
