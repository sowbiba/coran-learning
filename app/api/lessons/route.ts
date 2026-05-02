import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getOrCreateLesson } from "@/lib/lessons/repo";

const Body = z.object({
  chunkId: z.number().int().positive(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const userId = await getCurrentUserId();
  const lesson = await getOrCreateLesson(userId, parsed.data.chunkId);
  return NextResponse.json(lesson);
}
