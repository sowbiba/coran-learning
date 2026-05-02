/**
 * Machine à états d'une leçon (chunk-pour-un-élève).
 *
 * Le module est un ensemble de fonctions pures : à partir d'un état courant
 * et d'une action, il calcule le patch à appliquer (nouvel état + horodatages
 * à mettre à jour). Le caller (route handler côté server, ou client en
 * optimistic update) applique le patch sur la row `lessons`.
 *
 * La queue de murāja'a (sabaq/sabqi/manzil) et `nextDueAt` sont gérés par
 * `lib/srs/scheduler.ts`. Cette machine ne touche que la dimension "élève
 * face à la leçon".
 *
 * Cycle :
 *
 *   not_started ──introduce──▶ introduced
 *                                   │
 *                            practice│
 *                                   ▼
 *                              learning ◀──reject_mastery──┐
 *                                   │                       │
 *                          ready_to_recite                  │
 *                                   │                       │
 *                       complete_recitation                 │
 *                                   │                       │
 *                                   ▼                       │
 *                                recited ──master──▶ mastered
 *                                   └──────────────reject_mastery
 *
 * Action `revive_for_review` : `mastered` → `ready_to_recite`, déclenchée
 * par le scheduler quand `nextDueAt` arrive (sabqi/manzil).
 *
 * Action `restart` : revenir à `introduced` depuis n'importe où (l'élève
 * veut tout reprendre).
 */

import type { LessonState } from "@/lib/db/schema";

export type LessonAction =
  | "introduce"
  | "review_introduction"
  | "practice"
  | "ready_to_recite"
  | "complete_recitation"
  | "master"
  | "reject_mastery"
  | "revive_for_review"
  | "restart";

/** Champs d'horodatage à patcher sur la row lessons. */
export type TouchedTimestamp =
  | "introducedAt"
  | "lastPracticedAt"
  | "lastRecitedAt"
  | "masteredAt"
  | "clearMasteredAt";

export type TransitionResult =
  | { ok: true; nextState: LessonState; touch: TouchedTimestamp[] }
  | { ok: false; reason: string };

/**
 * Calcule la transition. Pure : ne lit ni n'écrit rien.
 *
 * @param current  État actuel de la leçon
 * @param action   Action déclenchée par l'élève (ou le scheduler)
 */
export function transition(current: LessonState, action: LessonAction): TransitionResult {
  switch (action) {
    case "introduce": {
      if (current === "not_started" || current === "introduced") {
        return { ok: true, nextState: "introduced", touch: ["introducedAt"] };
      }
      return reject(current, action);
    }

    case "review_introduction": {
      // L'élève peut revoir l'intro à tout moment. Pas de changement d'état,
      // juste un horodatage de "présence avec le Professeur".
      if (current === "not_started") {
        return { ok: true, nextState: "introduced", touch: ["introducedAt"] };
      }
      return { ok: true, nextState: current, touch: [] };
    }

    case "practice": {
      // L'élève va pratiquer en autonomie. Sortie possible depuis introduced,
      // ready_to_recite, ou recited (re-pratique après échec).
      if (current === "introduced" || current === "ready_to_recite" || current === "recited") {
        return { ok: true, nextState: "learning", touch: ["lastPracticedAt"] };
      }
      if (current === "learning") {
        return { ok: true, nextState: "learning", touch: ["lastPracticedAt"] };
      }
      return reject(current, action);
    }

    case "ready_to_recite": {
      if (current === "learning" || current === "introduced") {
        return { ok: true, nextState: "ready_to_recite", touch: [] };
      }
      return reject(current, action);
    }

    case "complete_recitation": {
      // Récitation terminée — quelle qu'elle soit, on enregistre.
      if (current === "ready_to_recite" || current === "learning") {
        return { ok: true, nextState: "recited", touch: ["lastRecitedAt"] };
      }
      return reject(current, action);
    }

    case "master": {
      // L'élève (ou le Professeur) confirme que c'est maîtrisé.
      if (current === "recited") {
        return { ok: true, nextState: "mastered", touch: ["masteredAt"] };
      }
      return reject(current, action);
    }

    case "reject_mastery": {
      // L'élève dit "pas encore", on retourne à learning.
      if (current === "recited") {
        return { ok: true, nextState: "learning", touch: ["lastPracticedAt"] };
      }
      return reject(current, action);
    }

    case "revive_for_review": {
      // Le scheduler signale qu'une leçon mastered est due en révision.
      if (current === "mastered") {
        return { ok: true, nextState: "ready_to_recite", touch: [] };
      }
      return reject(current, action);
    }

    case "restart": {
      // Revoir l'introduction à zéro. Possible depuis n'importe où.
      return {
        ok: true,
        nextState: "introduced",
        touch: ["introducedAt", "clearMasteredAt"],
      };
    }
  }
}

function reject(current: LessonState, action: LessonAction): TransitionResult {
  return {
    ok: false,
    reason: `Action "${action}" non autorisée depuis l'état "${current}".`,
  };
}

/**
 * Indique si l'élève peut "réciter au Professeur" depuis cet état.
 * Sert à activer/désactiver le bouton dans /today.
 */
export function canRecite(current: LessonState): boolean {
  return (
    current === "introduced" ||
    current === "learning" ||
    current === "ready_to_recite" ||
    current === "recited"
  );
}

/**
 * Indique si la leçon est en attente d'une révision (mastered + due aujourd'hui).
 * Le scheduler reste l'autorité sur "due aujourd'hui".
 */
export function isMastered(current: LessonState): boolean {
  return current === "mastered";
}

/**
 * Indique si l'élève a des actions disponibles aujourd'hui (au moins
 * "Continuer" cette leçon dans /today). Une leçon mastered sans nextDueAt
 * passé n'est PAS active — on ne la suggère pas.
 */
export function isActive(current: LessonState): boolean {
  return current !== "not_started" && current !== "mastered";
}
