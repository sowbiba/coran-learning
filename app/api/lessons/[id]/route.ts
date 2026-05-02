import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getLesson, applyTransition } from "@/lib/lessons/repo";

const ActionEnum = z.enum([
  "introduce",
  "review_introduction",
  "practice",
  "ready_to_recite",
  "complete_recitation",
  "master",
  "reject_mastery",
  "revive_for_review",
  "restart",
]);

const Body = z.object({
  action: ActionEnum,
  ratings: z
    .array(
      z.object({
        ayahId: z.number().int().positive(),
        rating: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      }),
    )
    .optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const userId = await getCurrentUserId();
  const lesson = await getLesson(id, userId);
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  try {
    const updated = await applyTransition({
      lesson,
      action: parsed.data.action,
      ratings: parsed.data.ratings,
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
