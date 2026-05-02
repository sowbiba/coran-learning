/**
 * Données simulées pour la page /today, le temps que l'ingestion réelle
 * (Tanzil + QuranEnc + Notion) et la connexion DB soient en place.
 *
 * Le shape miroite ce que la query du DB rendra :
 *  - chunks pédagogiques avec leur label
 *  - état de leçon par chunk pour l'utilisateur
 *  - métadonnées d'affichage (sourate, plage de versets, période)
 *
 * À supprimer dès que `lib/content/quran.ts` lit la vraie DB.
 */

import type { LessonState, Queue } from "@/lib/db/schema";

export type MockTodayItem = {
  lessonId: string;
  chunkLabel: string;
  surahName: string;
  surahNumber: number;
  ayahRange: string;
  state: LessonState;
  queue: Queue | null;
  introducedAt: Date | null;
  nextDueAt: Date | null;
  lastPracticedAt: Date | null;
};

const yesterday = (offset = 1) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offset);
  return d;
};

const tomorrow = (offset = 1) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};

const today = () => new Date();

export const mockTodayItems: MockTodayItem[] = [
  {
    lessonId: "mock-lesson-1",
    chunkLabel: "Al-Fātiḥa",
    surahName: "L'Ouverture",
    surahNumber: 1,
    ayahRange: "Versets 1 à 7",
    state: "learning",
    queue: null,
    introducedAt: yesterday(2),
    nextDueAt: null,
    lastPracticedAt: yesterday(),
  },
  {
    lessonId: "mock-lesson-2",
    chunkLabel: "An-Nās",
    surahName: "Les Hommes",
    surahNumber: 114,
    ayahRange: "Versets 1 à 6",
    state: "ready_to_recite",
    queue: null,
    introducedAt: yesterday(3),
    nextDueAt: null,
    lastPracticedAt: today(),
  },
  {
    lessonId: "mock-lesson-3",
    chunkLabel: "Al-Falaq",
    surahName: "L'Aube naissante",
    surahNumber: 113,
    ayahRange: "Versets 1 à 5",
    state: "mastered",
    queue: "sabqi",
    introducedAt: yesterday(5),
    nextDueAt: today(),
    lastPracticedAt: yesterday(2),
  },
  {
    lessonId: "mock-lesson-4",
    chunkLabel: "Al-Ikhlāṣ",
    surahName: "Le Monothéisme pur",
    surahNumber: 112,
    ayahRange: "Versets 1 à 4",
    state: "mastered",
    queue: "sabqi",
    introducedAt: yesterday(7),
    nextDueAt: today(),
    lastPracticedAt: yesterday(3),
  },
];

export const mockNewLessonSuggestion: Pick<
  MockTodayItem,
  "chunkLabel" | "surahName" | "surahNumber" | "ayahRange"
> = {
  chunkLabel: "Al-Masad",
  surahName: "Les Fibres",
  surahNumber: 111,
  ayahRange: "Versets 1 à 5",
};
