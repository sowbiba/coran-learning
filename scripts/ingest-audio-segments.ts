/**
 * Ingestion des timings mot-à-mot pour Husary Muʿallim 128.
 *
 * Source : API qurancdn (réciter id 12 = Husary Muallim).
 *   GET https://api.qurancdn.com/api/qdc/audio/reciters/12/audio_files?chapter=N&segments=true
 *
 * Format réponse (par sourate) :
 *   audio_files[0].verse_timings = [{
 *     verse_key: "1:2",
 *     timestamp_from: 7840,        // début du verset dans le mp3 chapitre entier
 *     timestamp_to: 16090,
 *     segments: [[wordIdx_1based, startMs_abs, endMs_abs], ...]
 *   }]
 *
 * On normalise : startMs/endMs deviennent relatifs au début du mp3 *par verset*
 * (en soustrayant verse_timing.timestamp_from), puisque c'est ce qu'on lit côté
 * client (`audio.currentTime` sur le mp3 everyayah par verset).
 *
 * Idempotent — un simple UPDATE sur (ayah_id, reciter).
 *
 * Usage :
 *   npm run ingest:segments          → toutes les sourates ingérées en DB
 *   INGEST_SCOPE=v1 npm run ingest:segments
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ayahs, audioFiles, type AudioSegment } from "@/lib/db/schema";
import { ALL_SURAHS, V1_SURAHS, SURAH_META } from "@/lib/content/surah-meta";

const RECITER_ID = 12;
const RECITER_KEY = "husary_muallim_128";
const API_URL = (chapter: number) =>
  `https://api.qurancdn.com/api/qdc/audio/reciters/${RECITER_ID}/audio_files?chapter=${chapter}&segments=true`;

type QdcSegment = [number, number, number] | [number, number, number, number, number];

type QdcVerseTiming = {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
  duration: number;
  segments: QdcSegment[];
};

type QdcResponse = {
  audio_files: Array<{
    chapter_id: number;
    verse_timings: QdcVerseTiming[];
  }>;
};

async function fetchSegments(surah: number): Promise<QdcVerseTiming[]> {
  const res = await fetch(API_URL(surah));
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for surah ${surah}`);
  const data = (await res.json()) as QdcResponse;
  const file = data.audio_files[0];
  if (!file) throw new Error(`No audio_file in response for surah ${surah}`);
  return file.verse_timings;
}

/** Tronque float → int, et soustrait l'offset pour ramener au temps relatif verset. */
function normalizeSegments(raw: QdcSegment[], offsetMs: number): AudioSegment[] {
  const out: AudioSegment[] = [];
  for (const s of raw) {
    // L'API renvoie parfois 5-tuples (subword splits) — on ne garde que les 3 premiers
    // qui sont [wordIdx, startMs, endMs] alignés sur le mot complet.
    const wordIdx = s[0];
    const startMs = Math.max(0, Math.round((s[1] as number) - offsetMs));
    const endMs = Math.max(startMs, Math.round((s[2] as number) - offsetMs));
    out.push([wordIdx, startMs, endMs]);
  }
  return out;
}

async function ingestSurah(surah: number): Promise<{ versesUpdated: number }> {
  const timings = await fetchSegments(surah);

  // Récupère tous les ayahs de la sourate pour mapper numberInSurah → id
  const ayahRows = await db
    .select({ id: ayahs.id, numberInSurah: ayahs.numberInSurah })
    .from(ayahs)
    .where(eq(ayahs.surahId, surah));
  const byNum = new Map(ayahRows.map((a) => [a.numberInSurah, a.id]));

  let versesUpdated = 0;
  for (const t of timings) {
    const [, vStr] = t.verse_key.split(":");
    const numberInSurah = Number(vStr);
    const ayahId = byNum.get(numberInSurah);
    if (!ayahId) {
      // Sourate non ingérée en DB — on saute proprement.
      continue;
    }
    const segments = normalizeSegments(t.segments, t.timestamp_from);
    const result = await db
      .update(audioFiles)
      .set({ segmentsJson: segments })
      .where(and(eq(audioFiles.ayahId, ayahId), eq(audioFiles.reciter, RECITER_KEY)));
    // drizzle ne renvoie pas toujours un row count exploitable — on incrémente optimistiquement
    versesUpdated += 1;
    void result;
  }

  return { versesUpdated };
}

async function main() {
  const scope = process.env.INGEST_SCOPE === "v1" ? V1_SURAHS : ALL_SURAHS;
  const start = Date.now();
  console.log(
    `Ingestion segments ${scope === V1_SURAHS ? "v1 (juz' 30)" : "complète"} — ${scope.length} sourates`,
  );

  let totalVerses = 0;
  for (const n of scope) {
    const meta = SURAH_META[n];
    process.stdout.write(
      `  · Sourate ${n.toString().padStart(3)} ${meta.name_translit.padEnd(22)} ... `,
    );
    try {
      const { versesUpdated } = await ingestSurah(n);
      totalVerses += versesUpdated;
      console.log(`✓ ${versesUpdated} versets`);
    } catch (err) {
      console.log(`✗ ${(err as Error).message}`);
      throw err;
    }
  }

  const duration = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✓ Terminé en ${duration}s : ${totalVerses} versets timings ingérés.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n✗ Ingestion failed:", err);
    process.exit(1);
  });
