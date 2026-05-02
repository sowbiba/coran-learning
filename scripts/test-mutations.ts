/**
 * Test rapide e2e des API de mutation.
 * Suppose que `npm run dev` tourne sur http://localhost:3000.
 */

import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { lessons, users } from "@/lib/db/schema";

const BASE = "http://localhost:3000";

async function main() {
  // 1. Visit /recite/1 to ensure the lesson is created server-side
  console.log("→ GET /recite/1 ...");
  await fetch(`${BASE}/recite/1`);

  // 2. Find lessons
  const us = await db.select().from(users);
  const ls = await db.select().from(lessons);
  console.log(`  users: ${us.length} (${us.map((u) => u.email).join(", ")})`);
  console.log(
    `  lessons: ${ls.length}`,
    ls.map((l) => ({ chunk: l.chunkId, state: l.state, queue: l.queue })),
  );

  if (ls.length === 0) {
    throw new Error("No lessons created — check getOrCreateLesson");
  }

  const lesson = ls[0]!;

  // 3. complete_recitation
  console.log(`→ PATCH /api/lessons/${lesson.id} complete_recitation ...`);
  const r1 = await fetch(`${BASE}/api/lessons/${lesson.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "complete_recitation",
      ratings: [{ ayahId: 1, rating: 1 }],
    }),
  });
  console.log(`  status: ${r1.status}`);
  if (!r1.ok) console.log("  body:", await r1.text());

  // 4. master
  console.log(`→ PATCH /api/lessons/${lesson.id} master ...`);
  const r2 = await fetch(`${BASE}/api/lessons/${lesson.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "master" }),
  });
  console.log(`  status: ${r2.status}`);

  // 5. Check final state
  const after = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lesson.id))
    .limit(1);
  const l = after[0]!;
  console.log("  final state:", {
    state: l.state,
    queue: l.queue,
    masteredAt: l.masteredAt?.toISOString(),
    nextDueAt: l.nextDueAt?.toISOString(),
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
