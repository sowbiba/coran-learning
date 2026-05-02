/**
 * Moteur de murāja'a — scheduler à trois queues sabaq / sabqi / manzil.
 *
 * Pure : ne lit ni n'écrit le DB. Les call-sites passent les `lessons` et
 * appliquent les patches retournés.
 *
 * Définitions :
 *   - `sabaq`  : leçons en cours d'apprentissage (state ∉ mastered).
 *                Ce sont les leçons "actives" — l'élève les voit en haut du
 *                tableau du jour pour les continuer.
 *   - `sabqi`  : leçons fraîchement maîtrisées, à réviser sur les 7 prochains
 *                jours. Espacement progressif : J+1, J+2, J+4, J+7 → graduation.
 *   - `manzil` : leçons consolidées (ont passé sabqi). FSRS (free spaced
 *                repetition scheduler) pilote l'intervalle individuel de
 *                chaque leçon en fonction de son historique de ratings.
 */

import {
  createEmptyCard,
  FSRS,
  generatorParameters,
  Rating as FsrsRating,
  type Card,
} from "ts-fsrs";
import type { Lesson, Queue } from "@/lib/db/schema";

// ──────────────────────────────────────────────────────────────
// Constantes (configurables plus tard depuis le profil utilisateur)
// ──────────────────────────────────────────────────────────────

/** Jours après le 1er master où la leçon doit être revue en sabqi. */
const SABQI_INTERVALS_DAYS = [1, 2, 4, 7] as const;

/** Au-delà de ce nombre de jours depuis masteredAt, on graduate vers manzil. */
const SABQI_GRADUATE_AFTER_DAYS = 7;

/** Plancher d'intervalle dans manzil — FSRS peut proposer des intervalles
 *  très courts pour les premières répétitions, on assure qu'on garde la
 *  philosophie "long terme" en posant une borne minimale. */
const MANZIL_MIN_INTERVAL_DAYS = 15;

/** Intervalle par défaut quand FSRS n'a pas encore d'historique. */
const MANZIL_INTERVAL_DAYS = 30;

/** Pénalité en jours si rating "hésité" : on rapproche la prochaine révision. */
const HESITATED_BACKOFF_FACTOR = 0.5;

const fsrs = new FSRS(generatorParameters({ enable_fuzz: true }));

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type Rating = 1 | 2 | 3; // 1 = OK, 2 = hésité, 3 = oublié

export type DailyQueue = {
  /** Leçons en cours, à continuer (état ∉ mastered). */
  sabaq: Lesson[];
  /** Leçons mastered récentes, dues pour révision aujourd'hui. */
  sabqi: Lesson[];
  /** Leçons mastered anciennes, dues pour révision aujourd'hui. */
  manzil: Lesson[];
};

export type ReviewSchedule = {
  queue: Queue;
  nextDueAt: Date;
  /** Vrai si la leçon graduate de sabqi à manzil (ou y entre directement). */
  graduates: boolean;
  /** État FSRS sérialisé à persister dans `lessons.fsrsStateJson`. Présent
   *  uniquement quand on programme dans la queue manzil. */
  fsrsState?: SerializedFsrsCard;
};

/**
 * Forme JSON-friendly d'une `Card` ts-fsrs (les Date deviennent des ISO
 * strings côté DB ; on les reconstruit en helper).
 */
export type SerializedFsrsCard = {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string;
};

function serializeCard(card: Card): SerializedFsrsCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : undefined,
  };
}

function deserializeCard(s: SerializedFsrsCard): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsed_days,
    scheduled_days: s.scheduled_days,
    learning_steps: s.learning_steps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.last_review ? new Date(s.last_review) : undefined,
  } as Card;
}

/** Mappe nos ratings (1=OK, 2=hésité) vers FSRS Rating (Good, Hard).
 *  Le rating 3 (oublié) ne passe jamais ici — il déclenche reject_mastery
 *  côté state machine, ce qui sort la leçon de manzil et la ramène en
 *  apprentissage actif. */
function toFsrsRating(rating: 1 | 2): FsrsRating {
  return rating === 1 ? FsrsRating.Good : FsrsRating.Hard;
}

// ──────────────────────────────────────────────────────────────
// Helpers de date
// ──────────────────────────────────────────────────────────────

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function diffInDays(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function isDueOnOrBefore(due: Date | null | undefined, now: Date): boolean {
  if (!due) return false;
  return startOfDayUTC(due).getTime() <= startOfDayUTC(now).getTime();
}

// ──────────────────────────────────────────────────────────────
// Daily queue : ce que l'élève voit aujourd'hui
// ──────────────────────────────────────────────────────────────

/**
 * Calcule les trois queues du jour.
 *
 * Une leçon en cours (non-mastered, état ∉ {not_started, mastered}) va dans
 * `sabaq` quel que soit nextDueAt — l'élève peut la continuer à tout moment.
 *
 * Une leçon mastered avec `nextDueAt <= today` va dans `sabqi` ou `manzil`
 * selon son champ `queue`.
 */
export function computeDailyQueue(allLessons: Lesson[], now: Date): DailyQueue {
  const out: DailyQueue = { sabaq: [], sabqi: [], manzil: [] };

  for (const lesson of allLessons) {
    if (lesson.state === "not_started") continue;

    if (lesson.state !== "mastered") {
      // Leçon en cours, on la propose dans sabaq.
      out.sabaq.push(lesson);
      continue;
    }

    // Leçon mastered : ne la sort que si due pour révision aujourd'hui.
    if (!isDueOnOrBefore(lesson.nextDueAt, now)) continue;

    if (lesson.queue === "manzil") {
      out.manzil.push(lesson);
    } else {
      // Par défaut une mastered due est en sabqi.
      out.sabqi.push(lesson);
    }
  }

  // Tri stable : par nextDueAt croissant pour les queues de révision,
  // par updatedAt décroissant pour sabaq (le plus récent en haut).
  out.sabqi.sort((a, b) => byDate(a.nextDueAt, b.nextDueAt));
  out.manzil.sort((a, b) => byDate(a.nextDueAt, b.nextDueAt));
  out.sabaq.sort((a, b) => byDate(b.updatedAt, a.updatedAt));

  return out;
}

function byDate(a: Date | null | undefined, b: Date | null | undefined): number {
  const av = a ? a.getTime() : 0;
  const bv = b ? b.getTime() : 0;
  return av - bv;
}

// ──────────────────────────────────────────────────────────────
// Programmation après une récitation
// ──────────────────────────────────────────────────────────────

/**
 * Programme la première mise en sabqi après le 1er mastery d'une leçon.
 * Première révision : J+1.
 */
export function placeInSabqi(now: Date): ReviewSchedule {
  return {
    queue: "sabqi",
    nextDueAt: addDays(startOfDayUTC(now), SABQI_INTERVALS_DAYS[0]),
    graduates: false,
  };
}

/**
 * Programme la prochaine révision après une récitation réussie sur une leçon
 * déjà mastered (en sabqi ou manzil).
 *
 * Logique sabqi :
 *   - On regarde combien de jours depuis masteredAt, on choisit le prochain
 *     palier dans SABQI_INTERVALS_DAYS.
 *   - Si on dépasse SABQI_GRADUATE_AFTER_DAYS → graduate vers manzil (init FSRS).
 *
 * Logique manzil :
 *   - FSRS calcule l'intervalle à partir de la Card stockée
 *     (`lesson.fsrsStateJson`). Plancher de MANZIL_MIN_INTERVAL_DAYS pour
 *     éviter les intervalles trop courts au démarrage.
 *
 * Rating ajustement :
 *   - 1 (OK)      → FSRS Good
 *   - 2 (hésité)  → FSRS Hard (intervalle plus court)
 *   - 3 (oublié)  → caller doit appeler reject_mastery, pas cette fonction
 */
export function scheduleNextReview(
  lesson: Lesson,
  rating: Rating,
  now: Date,
): ReviewSchedule {
  if (rating === 3) {
    throw new Error(
      "scheduleNextReview ne doit pas être appelé avec rating=3 (oublié) — utiliser le flux reject_mastery côté state machine.",
    );
  }

  const masteredAt = lesson.masteredAt ? startOfDayUTC(lesson.masteredAt) : startOfDayUTC(now);
  const today = startOfDayUTC(now);
  const daysSinceMastered = diffInDays(today, masteredAt);

  // Graduation à manzil ?
  if (
    lesson.queue === "manzil" ||
    daysSinceMastered >= SABQI_GRADUATE_AFTER_DAYS
  ) {
    const prev = lesson.fsrsStateJson as SerializedFsrsCard | null | undefined;
    return scheduleManzil(rating, today, lesson.queue !== "manzil", prev ?? null);
  }

  // Encore en sabqi : prochain palier
  return scheduleSabqi(rating, today, daysSinceMastered);
}

function scheduleSabqi(rating: Rating, today: Date, daysSinceMastered: number): ReviewSchedule {
  // Trouver le prochain palier après daysSinceMastered
  const nextStep = SABQI_INTERVALS_DAYS.find((d) => d > daysSinceMastered);
  let intervalDays: number;
  if (nextStep) {
    intervalDays = nextStep - daysSinceMastered;
  } else {
    // Plus de palier dans sabqi → graduation (init FSRS card)
    return scheduleManzil(rating, today, true, null);
  }

  if (rating === 2) {
    intervalDays = Math.max(1, Math.round(intervalDays * HESITATED_BACKOFF_FACTOR));
  }

  return {
    queue: "sabqi",
    nextDueAt: addDays(today, intervalDays),
    graduates: false,
  };
}

function scheduleManzil(
  rating: Rating,
  today: Date,
  justGraduated: boolean,
  prevState: SerializedFsrsCard | null,
): ReviewSchedule {
  // Première répétition manzil sans état FSRS : on impose l'intervalle par défaut
  // et on initialise une Card vierge calée à cet intervalle.
  if (!prevState) {
    const intervalDays =
      rating === 2
        ? Math.max(MANZIL_MIN_INTERVAL_DAYS, Math.round(MANZIL_INTERVAL_DAYS * HESITATED_BACKOFF_FACTOR))
        : MANZIL_INTERVAL_DAYS;
    const nextDueAt = addDays(today, intervalDays);
    const seedCard = createEmptyCard(today);
    return {
      queue: "manzil",
      nextDueAt,
      graduates: justGraduated,
      fsrsState: serializeCard({ ...seedCard, due: nextDueAt }),
    };
  }

  const baseCard = deserializeCard(prevState);
  const recordLog = fsrs.repeat(baseCard, today);
  const nextCard =
    rating === 1
      ? recordLog[FsrsRating.Good].card
      : recordLog[FsrsRating.Hard].card;

  // Plancher d'intervalle pour rester cohérent avec la philosophie "long terme"
  const proposedDue = nextCard.due;
  const minDate = addDays(today, MANZIL_MIN_INTERVAL_DAYS);
  const nextDueAt =
    proposedDue.getTime() < minDate.getTime() ? minDate : proposedDue;

  return {
    queue: "manzil",
    nextDueAt,
    graduates: justGraduated,
    fsrsState: serializeCard({ ...nextCard, due: nextDueAt }),
  };
}

// ──────────────────────────────────────────────────────────────
// Exposed for tests / debugging
// ──────────────────────────────────────────────────────────────

export const __schedulerInternals = {
  SABQI_INTERVALS_DAYS,
  SABQI_GRADUATE_AFTER_DAYS,
  MANZIL_INTERVAL_DAYS,
  MANZIL_MIN_INTERVAL_DAYS,
  HESITATED_BACKOFF_FACTOR,
};
