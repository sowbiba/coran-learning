import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  ayahs as ayahsTable,
  chunks as chunksTable,
  lessons as lessonsTable,
  recitationEvents,
  surahs as surahsTable,
} from "@/lib/db/schema";
import type { LessonState, Queue } from "@/lib/db/schema";

export type UserStats = {
  totalAyahs: number;
  startedAyahs: number;
  masteredAyahs: number;
  startedChunks: number;
  masteredChunks: number;
  byQueue: Record<Queue, number>;
  byState: Record<LessonState, number>;
  recentDays: { day: string; count: number }[];
  perSurah: {
    surahId: number;
    surahNameTranslit: string;
    surahNameFr: string;
    totalAyahs: number;
    startedAyahs: number;
    masteredAyahs: number;
  }[];
};

const TOTAL_QURAN_AYAHS = 6236;

export async function getUserStats(userId: string): Promise<UserStats> {
  // 1. Lessons + chunks for this user
  const userLessonRows = await db
    .select({
      lesson: lessonsTable,
      chunk: chunksTable,
    })
    .from(lessonsTable)
    .innerJoin(chunksTable, eq(lessonsTable.chunkId, chunksTable.id))
    .where(eq(lessonsTable.userId, userId));

  let startedAyahs = 0;
  let masteredAyahs = 0;
  let startedChunks = 0;
  let masteredChunks = 0;
  const byQueue: Record<Queue, number> = { sabaq: 0, sabqi: 0, manzil: 0 };
  const byState: Record<LessonState, number> = {
    not_started: 0,
    introduced: 0,
    learning: 0,
    ready_to_recite: 0,
    recited: 0,
    mastered: 0,
  };

  // Per-surah aggregation
  const surahAgg = new Map<
    number,
    { startedAyahs: number; masteredAyahs: number }
  >();

  for (const { lesson, chunk } of userLessonRows) {
    byState[lesson.state] += 1;
    if (lesson.queue) byQueue[lesson.queue] += 1;
    if (lesson.state === "not_started") continue;

    startedChunks += 1;
    startedAyahs += chunk.ayahCount;
    const cur = surahAgg.get(chunk.surahId) ?? {
      startedAyahs: 0,
      masteredAyahs: 0,
    };
    cur.startedAyahs += chunk.ayahCount;

    if (lesson.state === "mastered") {
      masteredChunks += 1;
      masteredAyahs += chunk.ayahCount;
      cur.masteredAyahs += chunk.ayahCount;
    }
    surahAgg.set(chunk.surahId, cur);
  }

  // 2. Recent activity: count recitation_events per day, last 30 days
  const sinceDate = new Date();
  sinceDate.setUTCDate(sinceDate.getUTCDate() - 29);
  sinceDate.setUTCHours(0, 0, 0, 0);

  const recentRows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${recitationEvents.ts}), 'YYYY-MM-DD')`,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(recitationEvents)
    .where(and(eq(recitationEvents.userId, userId), gte(recitationEvents.ts, sinceDate)))
    .groupBy(sql`date_trunc('day', ${recitationEvents.ts})`)
    .orderBy(desc(sql`date_trunc('day', ${recitationEvents.ts})`));

  // Build a contiguous 30-day series, filling gaps with 0
  const recentDays: { day: string; count: number }[] = [];
  const dayMap = new Map(recentRows.map((r) => [r.day, r.count]));
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    recentDays.push({ day: key, count: dayMap.get(key) ?? 0 });
  }

  // 3. Per-surah progress: get totals + names for surahs the user has started
  const startedSurahIds = Array.from(surahAgg.keys());
  let perSurah: UserStats["perSurah"] = [];
  if (startedSurahIds.length > 0) {
    const surahRows = await db
      .select({
        id: surahsTable.id,
        nameTranslit: surahsTable.nameTranslit,
        nameFr: surahsTable.nameFr,
        ayahCount: surahsTable.ayahCount,
      })
      .from(surahsTable);

    const surahMap = new Map(surahRows.map((s) => [s.id, s]));
    perSurah = startedSurahIds
      .map((sid) => {
        const s = surahMap.get(sid)!;
        const agg = surahAgg.get(sid)!;
        return {
          surahId: sid,
          surahNameTranslit: s.nameTranslit,
          surahNameFr: s.nameFr,
          totalAyahs: s.ayahCount,
          startedAyahs: agg.startedAyahs,
          masteredAyahs: agg.masteredAyahs,
        };
      })
      .sort((a, b) => b.masteredAyahs / b.totalAyahs - a.masteredAyahs / a.totalAyahs);
  }

  return {
    totalAyahs: TOTAL_QURAN_AYAHS,
    startedAyahs,
    masteredAyahs,
    startedChunks,
    masteredChunks,
    byQueue,
    byState,
    recentDays,
    perSurah,
  };
}
