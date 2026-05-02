import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ayahNotes, type AyahNote } from "@/lib/db/schema";

export async function getNote(userId: string, ayahId: number): Promise<AyahNote | null> {
  const rows = await db
    .select()
    .from(ayahNotes)
    .where(and(eq(ayahNotes.userId, userId), eq(ayahNotes.ayahId, ayahId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listNotesForAyahs(
  userId: string,
  ayahIds: number[],
): Promise<Map<number, AyahNote>> {
  const out = new Map<number, AyahNote>();
  if (ayahIds.length === 0) return out;
  const rows = await db
    .select()
    .from(ayahNotes)
    .where(and(eq(ayahNotes.userId, userId)));
  for (const r of rows) {
    if (ayahIds.includes(r.ayahId)) out.set(r.ayahId, r);
  }
  return out;
}

/**
 * Idempotent : si une note existe pour (userId, ayahId), on la met à jour.
 * Sinon on insère. Si bodyMd est vide après trim, on supprime la note.
 */
export async function upsertNote(
  userId: string,
  ayahId: number,
  bodyMd: string,
): Promise<AyahNote | null> {
  const trimmed = bodyMd.trim();

  if (trimmed.length === 0) {
    await db
      .delete(ayahNotes)
      .where(and(eq(ayahNotes.userId, userId), eq(ayahNotes.ayahId, ayahId)));
    return null;
  }

  const existing = await getNote(userId, ayahId);
  const now = new Date();

  if (existing) {
    const updated = await db
      .update(ayahNotes)
      .set({ bodyMd: trimmed, updatedAt: now })
      .where(eq(ayahNotes.id, existing.id))
      .returning();
    return updated[0]!;
  }

  const inserted = await db
    .insert(ayahNotes)
    .values({ userId, ayahId, bodyMd: trimmed })
    .returning();
  return inserted[0]!;
}

export async function deleteNote(userId: string, ayahId: number): Promise<void> {
  await db
    .delete(ayahNotes)
    .where(and(eq(ayahNotes.userId, userId), eq(ayahNotes.ayahId, ayahId)));
}
