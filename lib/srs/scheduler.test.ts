import { describe, expect, it } from "vitest";
import type { Lesson } from "@/lib/db/schema";
import {
  __schedulerInternals,
  addDays,
  computeDailyQueue,
  placeInSabqi,
  scheduleNextReview,
  startOfDayUTC,
} from "./scheduler";

const NOW = new Date("2026-05-02T08:00:00Z");
const TODAY = startOfDayUTC(NOW);

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  const base: Lesson = {
    id: crypto.randomUUID(),
    userId: "u1",
    chunkId: 1,
    state: "not_started",
    queue: null,
    fsrsStateJson: null,
    introducedAt: null,
    lastPracticedAt: null,
    lastRecitedAt: null,
    masteredAt: null,
    nextDueAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
  return { ...base, ...overrides };
}

describe("computeDailyQueue", () => {
  it("place les leçons en cours dans sabaq", () => {
    const learning = makeLesson({ state: "learning", chunkId: 1 });
    const ready = makeLesson({ state: "ready_to_recite", chunkId: 2 });
    const introduced = makeLesson({ state: "introduced", chunkId: 3 });

    const q = computeDailyQueue([learning, ready, introduced], NOW);
    expect(q.sabaq).toHaveLength(3);
    expect(q.sabqi).toHaveLength(0);
    expect(q.manzil).toHaveLength(0);
  });

  it("ignore les leçons not_started", () => {
    const ns = makeLesson({ state: "not_started" });
    const q = computeDailyQueue([ns], NOW);
    expect(q.sabaq).toHaveLength(0);
    expect(q.sabqi).toHaveLength(0);
    expect(q.manzil).toHaveLength(0);
  });

  it("place une mastered en sabqi si due aujourd'hui", () => {
    const due = makeLesson({
      state: "mastered",
      queue: "sabqi",
      masteredAt: addDays(TODAY, -2),
      nextDueAt: TODAY,
    });
    const q = computeDailyQueue([due], NOW);
    expect(q.sabqi).toHaveLength(1);
    expect(q.manzil).toHaveLength(0);
  });

  it("ne propose pas une mastered dont la révision est dans le futur", () => {
    const future = makeLesson({
      state: "mastered",
      queue: "sabqi",
      masteredAt: TODAY,
      nextDueAt: addDays(TODAY, 3),
    });
    const q = computeDailyQueue([future], NOW);
    expect(q.sabqi).toHaveLength(0);
  });

  it("place une manzil due en queue manzil, pas sabqi", () => {
    const manzilDue = makeLesson({
      state: "mastered",
      queue: "manzil",
      masteredAt: addDays(TODAY, -45),
      nextDueAt: addDays(TODAY, -1), // due hier (rattrapage)
    });
    const q = computeDailyQueue([manzilDue], NOW);
    expect(q.manzil).toHaveLength(1);
    expect(q.sabqi).toHaveLength(0);
  });

  it("trie les sabqi par nextDueAt croissant (le plus en retard d'abord)", () => {
    const a = makeLesson({
      state: "mastered",
      queue: "sabqi",
      masteredAt: addDays(TODAY, -1),
      nextDueAt: TODAY,
      chunkId: 1,
    });
    const b = makeLesson({
      state: "mastered",
      queue: "sabqi",
      masteredAt: addDays(TODAY, -3),
      nextDueAt: addDays(TODAY, -2), // en retard
      chunkId: 2,
    });
    const q = computeDailyQueue([a, b], NOW);
    expect(q.sabqi[0]?.chunkId).toBe(2);
    expect(q.sabqi[1]?.chunkId).toBe(1);
  });
});

describe("placeInSabqi", () => {
  it("programme la 1ère révision à J+1", () => {
    const r = placeInSabqi(NOW);
    expect(r.queue).toBe("sabqi");
    expect(r.graduates).toBe(false);
    expect(r.nextDueAt.getTime()).toBe(addDays(TODAY, 1).getTime());
  });
});

describe("scheduleNextReview — sabqi", () => {
  it("après J+1 réussi, programme à J+2", () => {
    const lesson = makeLesson({
      state: "mastered",
      queue: "sabqi",
      masteredAt: addDays(TODAY, -1),
    });
    const r = scheduleNextReview(lesson, 1, NOW);
    expect(r.queue).toBe("sabqi");
    expect(r.graduates).toBe(false);
    expect(r.nextDueAt.getTime()).toBe(addDays(TODAY, 1).getTime());
  });

  it("après J+2 réussi, programme à J+4", () => {
    const lesson = makeLesson({
      state: "mastered",
      queue: "sabqi",
      masteredAt: addDays(TODAY, -2),
    });
    const r = scheduleNextReview(lesson, 1, NOW);
    expect(r.queue).toBe("sabqi");
    expect(r.nextDueAt.getTime()).toBe(addDays(TODAY, 2).getTime()); // J+4 = aujourd'hui +2
  });

  it("après J+4 réussi, programme à J+7", () => {
    const lesson = makeLesson({
      state: "mastered",
      queue: "sabqi",
      masteredAt: addDays(TODAY, -4),
    });
    const r = scheduleNextReview(lesson, 1, NOW);
    expect(r.nextDueAt.getTime()).toBe(addDays(TODAY, 3).getTime()); // J+7 - J+4 = 3
  });

  it("après J+7, graduate vers manzil", () => {
    const lesson = makeLesson({
      state: "mastered",
      queue: "sabqi",
      masteredAt: addDays(TODAY, -7),
    });
    const r = scheduleNextReview(lesson, 1, NOW);
    expect(r.queue).toBe("manzil");
    expect(r.graduates).toBe(true);
    expect(r.nextDueAt.getTime()).toBe(addDays(TODAY, 30).getTime());
  });

  it("rating 'hésité' raccourcit l'intervalle", () => {
    const lesson = makeLesson({
      state: "mastered",
      queue: "sabqi",
      masteredAt: addDays(TODAY, -2), // sortie attendue J+4
    });
    const ok = scheduleNextReview(lesson, 1, NOW);
    const hesite = scheduleNextReview(lesson, 2, NOW);
    expect(hesite.nextDueAt.getTime()).toBeLessThan(ok.nextDueAt.getTime());
  });
});

describe("scheduleNextReview — manzil", () => {
  it("OK : intervalle de 30 jours", () => {
    const lesson = makeLesson({
      state: "mastered",
      queue: "manzil",
      masteredAt: addDays(TODAY, -60),
    });
    const r = scheduleNextReview(lesson, 1, NOW);
    expect(r.queue).toBe("manzil");
    expect(r.graduates).toBe(false);
    expect(r.nextDueAt.getTime()).toBe(addDays(TODAY, 30).getTime());
  });

  it("hésité : intervalle réduit", () => {
    const lesson = makeLesson({
      state: "mastered",
      queue: "manzil",
      masteredAt: addDays(TODAY, -60),
    });
    const r = scheduleNextReview(lesson, 2, NOW);
    expect(r.nextDueAt.getTime()).toBeLessThan(addDays(TODAY, 30).getTime());
    expect(r.nextDueAt.getTime()).toBeGreaterThanOrEqual(addDays(TODAY, 7).getTime());
  });
});

describe("scheduleNextReview — invariants", () => {
  it("rejette rating=3 (oublié)", () => {
    const lesson = makeLesson({
      state: "mastered",
      queue: "sabqi",
      masteredAt: TODAY,
    });
    expect(() => scheduleNextReview(lesson, 3, NOW)).toThrow();
  });

  it("expose les constantes pour debug", () => {
    expect(__schedulerInternals.SABQI_GRADUATE_AFTER_DAYS).toBe(7);
    expect(__schedulerInternals.MANZIL_INTERVAL_DAYS).toBe(30);
  });
});
