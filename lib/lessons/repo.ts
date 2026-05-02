import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  lessons,
  recitationEvents,
  type Lesson,
  type LessonState,
  type Queue,
} from "@/lib/db/schema";
import { transition, type LessonAction } from "./state";
import { placeInSabqi, scheduleNextReview, type Rating } from "@/lib/srs/scheduler";

/**
 * Récupère la leçon pour (user, chunk) ou la crée en `not_started`.
 * Idempotent.
 */
export async function getOrCreateLesson(
  userId: string,
  chunkId: number,
): Promise<Lesson> {
  const existing = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.userId, userId), eq(lessons.chunkId, chunkId)))
    .limit(1);

  if (existing.length > 0) return existing[0]!;

  const inserted = await db
    .insert(lessons)
    .values({ userId, chunkId, state: "not_started" as LessonState })
    .returning();

  return inserted[0]!;
}

export async function getLesson(lessonId: string, userId: string): Promise<Lesson | null> {
  const rows = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.id, lessonId), eq(lessons.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listUserLessons(userId: string): Promise<Lesson[]> {
  return db.select().from(lessons).where(eq(lessons.userId, userId));
}

/**
 * Amène une leçon à l'état `ready_to_recite` quel que soit son point de
 * départ — appelé server-side au chargement de `/recite`.
 *
 * - depuis `not_started`        : introduce → ready_to_recite
 * - depuis `introduced`/`learning` : ready_to_recite
 * - depuis `recited`            : practice → ready_to_recite (l'élève réessaie)
 * - depuis `mastered`           : revive_for_review (révision sabqi/manzil)
 *
 * Si la leçon est déjà `ready_to_recite`, no-op.
 */
export async function prepareLessonForRecitation(lesson: Lesson): Promise<Lesson> {
  let l = lesson;
  if (l.state === "not_started") {
    l = await applyTransition({ lesson: l, action: "introduce" });
  }
  if (l.state === "mastered") {
    l = await applyTransition({ lesson: l, action: "revive_for_review" });
  }
  if (l.state === "recited") {
    l = await applyTransition({ lesson: l, action: "practice" });
  }
  if (l.state === "introduced" || l.state === "learning") {
    l = await applyTransition({ lesson: l, action: "ready_to_recite" });
  }
  return l;
}

export type ApplyTransitionInput = {
  lesson: Lesson;
  action: LessonAction;
  /** Pour complete_recitation : ratings par verset (persistés en recitation_events). */
  ratings?: { ayahId: number; rating: Rating }[];
};

/**
 * Applique une transition d'état + ses effets de bord :
 *   - met à jour les horodatages touchés
 *   - place / reprogramme la leçon dans la queue de murāja'a si master
 *   - persiste les recitation_events si fournis
 */
export async function applyTransition({
  lesson,
  action,
  ratings,
}: ApplyTransitionInput): Promise<Lesson> {
  const result = transition(lesson.state, action);
  if (!result.ok) {
    throw new Error(result.reason);
  }

  const now = new Date();
  const patch: Partial<typeof lessons.$inferInsert> = {
    state: result.nextState,
    updatedAt: now,
  };

  for (const key of result.touch) {
    switch (key) {
      case "introducedAt":
        patch.introducedAt = now;
        break;
      case "lastPracticedAt":
        patch.lastPracticedAt = now;
        break;
      case "lastRecitedAt":
        patch.lastRecitedAt = now;
        break;
      case "masteredAt":
        patch.masteredAt = now;
        break;
      case "clearMasteredAt":
        patch.masteredAt = null;
        patch.queue = null as Queue | null;
        patch.nextDueAt = null;
        break;
    }
  }

  // Effets de bord côté scheduler : quand on master, on place ou reprogramme.
  if (action === "master") {
    const isFirstMastery = !lesson.masteredAt;
    const sched = isFirstMastery
      ? placeInSabqi(now)
      : scheduleNextReview(lesson, 1, now);
    patch.queue = sched.queue;
    patch.nextDueAt = sched.nextDueAt;
  }

  // Persister les ratings reçus
  if (action === "complete_recitation" && ratings && ratings.length > 0) {
    await db.insert(recitationEvents).values(
      ratings.map((r) => ({
        userId: lesson.userId,
        ayahId: r.ayahId,
        lessonId: lesson.id,
        rating: r.rating,
      })),
    );
  }

  const updated = await db
    .update(lessons)
    .set(patch)
    .where(eq(lessons.id, lesson.id))
    .returning();

  return updated[0]!;
}
