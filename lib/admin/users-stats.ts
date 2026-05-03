import "server-only";
import { count, eq, max, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  ayahNotes,
  lessons,
  recitationEvents,
  recordings,
  users,
} from "@/lib/db/schema";

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  lessonsActive: number;
  lessonsMastered: number;
  notes: number;
  recordings: number;
  recitations: number;
  /** Dernière activité connue : max sur introduced/practiced/recited/mastered. */
  lastActivity: Date | null;
};

export type AdminGlobalStats = {
  totalUsers: number;
  totalLessonsActive: number;
  totalLessonsMastered: number;
  totalNotes: number;
  totalRecordings: number;
  totalRecitations: number;
};

/** Aggrégats par utilisateur, triés par dernière activité décroissante. */
export async function listAdminUserStats(): Promise<AdminUserRow[]> {
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(users);

  const out: AdminUserRow[] = [];

  for (const u of allUsers) {
    const [
      lessonsActiveRow,
      lessonsMasteredRow,
      notesRow,
      recordingsRow,
      recitationsRow,
      lastActivityRow,
    ] = await Promise.all([
      db
        .select({ n: count() })
        .from(lessons)
        .where(sql`${lessons.userId} = ${u.id} AND ${lessons.state} != 'mastered'`),
      db
        .select({ n: count() })
        .from(lessons)
        .where(sql`${lessons.userId} = ${u.id} AND ${lessons.state} = 'mastered'`),
      db
        .select({ n: count() })
        .from(ayahNotes)
        .where(eq(ayahNotes.userId, u.id)),
      db
        .select({ n: count() })
        .from(recordings)
        .where(eq(recordings.userId, u.id)),
      db
        .select({ n: count() })
        .from(recitationEvents)
        .where(eq(recitationEvents.userId, u.id)),
      db
        .select({
          ts: max(
            sql<Date>`GREATEST(
              COALESCE(${lessons.introducedAt}, 'epoch'::timestamptz),
              COALESCE(${lessons.lastPracticedAt}, 'epoch'::timestamptz),
              COALESCE(${lessons.lastRecitedAt}, 'epoch'::timestamptz),
              COALESCE(${lessons.masteredAt}, 'epoch'::timestamptz)
            )`,
          ),
        })
        .from(lessons)
        .where(eq(lessons.userId, u.id)),
    ]);

    const lastTs = lastActivityRow[0]?.ts;
    const lastActivity =
      lastTs && new Date(lastTs).getTime() > 0 ? new Date(lastTs) : null;

    out.push({
      ...u,
      lessonsActive: lessonsActiveRow[0]?.n ?? 0,
      lessonsMastered: lessonsMasteredRow[0]?.n ?? 0,
      notes: notesRow[0]?.n ?? 0,
      recordings: recordingsRow[0]?.n ?? 0,
      recitations: recitationsRow[0]?.n ?? 0,
      lastActivity,
    });
  }

  // Tri : dernière activité décroissante (les utilisateurs jamais actifs en bas)
  out.sort((a, b) => {
    const aTs = a.lastActivity?.getTime() ?? 0;
    const bTs = b.lastActivity?.getTime() ?? 0;
    return bTs - aTs;
  });

  return out;
}

export async function getAdminGlobalStats(): Promise<AdminGlobalStats> {
  const [usersRow, lessonsActiveRow, lessonsMasteredRow, notesRow, recordingsRow, recitationsRow] =
    await Promise.all([
      db.select({ n: count() }).from(users),
      db
        .select({ n: count() })
        .from(lessons)
        .where(sql`${lessons.state} != 'mastered'`),
      db
        .select({ n: count() })
        .from(lessons)
        .where(sql`${lessons.state} = 'mastered'`),
      db.select({ n: count() }).from(ayahNotes),
      db.select({ n: count() }).from(recordings),
      db.select({ n: count() }).from(recitationEvents),
    ]);

  return {
    totalUsers: usersRow[0]?.n ?? 0,
    totalLessonsActive: lessonsActiveRow[0]?.n ?? 0,
    totalLessonsMastered: lessonsMasteredRow[0]?.n ?? 0,
    totalNotes: notesRow[0]?.n ?? 0,
    totalRecordings: recordingsRow[0]?.n ?? 0,
    totalRecitations: recitationsRow[0]?.n ?? 0,
  };
}
