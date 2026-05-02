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
 *   - `manzil` : leçons consolidées (ont passé sabqi). Révision rotative
 *                longue, par défaut 30 jours.
 *
 * v1 : intervalles fixes simples. v2 : injecter ts-fsrs dans la queue manzil
 * pour ajuster individuellement chaque leçon en fonction des ratings.
 */

import type { Lesson, Queue } from "@/lib/db/schema";

// ──────────────────────────────────────────────────────────────
// Constantes (configurables plus tard depuis le profil utilisateur)
// ──────────────────────────────────────────────────────────────

/** Jours après le 1er master où la leçon doit être revue en sabqi. */
const SABQI_INTERVALS_DAYS = [1, 2, 4, 7] as const;

/** Au-delà de ce nombre de jours depuis masteredAt, on graduate vers manzil. */
const SABQI_GRADUATE_AFTER_DAYS = 7;

/** Intervalle de révision par défaut dans manzil (v1 simple). */
const MANZIL_INTERVAL_DAYS = 30;

/** Pénalité en jours si rating "hésité" : on rapproche la prochaine révision. */
const HESITATED_BACKOFF_FACTOR = 0.5;

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
};

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
 *   - Si on dépasse SABQI_GRADUATE_AFTER_DAYS → graduate vers manzil.
 *
 * Logique manzil :
 *   - Intervalle fixe (v1). Hooks FSRS en v2.
 *
 * Rating ajustement :
 *   - 1 (OK)      → intervalle normal
 *   - 2 (hésité)  → on raccourcit (HESITATED_BACKOFF_FACTOR)
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
    return scheduleManzil(rating, today, lesson.queue !== "manzil");
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
    // Plus de palier dans sabqi → graduation
    return scheduleManzil(rating, today, true);
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

function scheduleManzil(rating: Rating, today: Date, justGraduated: boolean): ReviewSchedule {
  let intervalDays = MANZIL_INTERVAL_DAYS;
  if (rating === 2) {
    intervalDays = Math.max(7, Math.round(intervalDays * HESITATED_BACKOFF_FACTOR));
  }

  return {
    queue: "manzil",
    nextDueAt: addDays(today, intervalDays),
    graduates: justGraduated,
  };
}

// ──────────────────────────────────────────────────────────────
// Exposed for tests / debugging
// ──────────────────────────────────────────────────────────────

export const __schedulerInternals = {
  SABQI_INTERVALS_DAYS,
  SABQI_GRADUATE_AFTER_DAYS,
  MANZIL_INTERVAL_DAYS,
  HESITATED_BACKOFF_FACTOR,
};
