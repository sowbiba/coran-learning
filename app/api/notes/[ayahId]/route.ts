import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { deleteNote, getNote, upsertNote } from "@/lib/notes/repo";

const Body = z.object({
  bodyMd: z.string().max(10_000),
});

function parseAyahId(s: string): number | null {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ayahId: string }> },
) {
  const { ayahId: raw } = await params;
  const ayahId = parseAyahId(raw);
  if (!ayahId) return NextResponse.json({ error: "Invalid ayahId" }, { status: 400 });

  const userId = await getCurrentUserId();
  const note = await getNote(userId, ayahId);
  return NextResponse.json(note ?? { bodyMd: "" });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ ayahId: string }> },
) {
  const { ayahId: raw } = await params;
  const ayahId = parseAyahId(raw);
  if (!ayahId) return NextResponse.json({ error: "Invalid ayahId" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const userId = await getCurrentUserId();
  const note = await upsertNote(userId, ayahId, parsed.data.bodyMd);
  return NextResponse.json(note ?? { bodyMd: "" });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ ayahId: string }> },
) {
  const { ayahId: raw } = await params;
  const ayahId = parseAyahId(raw);
  if (!ayahId) return NextResponse.json({ error: "Invalid ayahId" }, { status: 400 });

  const userId = await getCurrentUserId();
  await deleteNote(userId, ayahId);
  return new NextResponse(null, { status: 204 });
}
