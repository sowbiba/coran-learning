/**
 * Ingestion one-shot du contenu coranique pour le v1 (Al-Fātiḥa + Juz' 30).
 *
 * Sources :
 *  - alquran.cloud /v1/surah/{n}/quran-uthmani  → texte arabe + métadonnées
 *  - alquran.cloud /v1/surah/{n}/fr.hamidullah  → traduction française Hamidullah
 *  - everyayah.com/data/Husary_128kbps/{NNN}{AAA}.mp3 → audio (URL déterministe, pas de fetch)
 *
 * Idempotent : safe à re-runner. Utilise ON CONFLICT DO NOTHING là où possible.
 *
 * Usage : `npm run ingest:quran`
 */

import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  ayahs,
  audioFiles,
  chunks,
  surahs,
  translations,
} from "@/lib/db/schema";
import { SURAH_META, V1_SURAHS } from "@/lib/content/surah-meta";

const ALQURAN_BASE = "https://api.alquran.cloud/v1";
const TRANSLATION_SOURCE = "hamidullah_complexe_roi_fahd";
const RECITER = "husary_muallim_128";

type AyahJson = {
  number: number; // global ayah id 1..6236
  text: string;
  numberInSurah: number;
  juz: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean | { recommended?: boolean; obligatory?: boolean };
};

type SurahJson = {
  number: number;
  name: string; // arabic
  englishName: string;
  englishNameTranslation: string;
  revelationType: "Meccan" | "Medinan";
  numberOfAyahs: number;
  ayahs: AyahJson[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status}) for ${url}`);
  }
  const data = (await res.json()) as { code: number; status: string; data: T };
  if (data.code !== 200) {
    throw new Error(`API returned non-200 for ${url}: ${data.status}`);
  }
  return data.data;
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

function audioUrlFor(surah: number, ayah: number): string {
  return `https://everyayah.com/data/Husary_128kbps/${pad3(surah)}${pad3(ayah)}.mp3`;
}

async function ingestSurah(n: number) {
  const meta = SURAH_META[n];
  if (!meta) throw new Error(`Missing SURAH_META for surah ${n}`);

  const [ar, fr] = await Promise.all([
    fetchJson<SurahJson>(`${ALQURAN_BASE}/surah/${n}/quran-uthmani`),
    fetchJson<SurahJson>(`${ALQURAN_BASE}/surah/${n}/fr.hamidullah`),
  ]);

  if (ar.numberOfAyahs !== fr.numberOfAyahs) {
    throw new Error(
      `Mismatch ayah count for surah ${n}: ar=${ar.numberOfAyahs} fr=${fr.numberOfAyahs}`,
    );
  }

  // 1. Surah row (idempotent via ON CONFLICT DO NOTHING)
  await db
    .insert(surahs)
    .values({
      id: n,
      nameAr: ar.name,
      nameFr: meta.name_fr,
      nameTranslit: meta.name_translit,
      period: ar.revelationType === "Meccan" ? "meccan" : "medinan",
      ayahCount: ar.numberOfAyahs,
    })
    .onConflictDoNothing();

  // 2. Ayahs + translations + audio (per-row, all idempotent)
  for (let i = 0; i < ar.ayahs.length; i++) {
    const ayahAr = ar.ayahs[i]!;
    const ayahFr = fr.ayahs[i]!;

    await db
      .insert(ayahs)
      .values({
        id: ayahAr.number,
        surahId: n,
        numberInSurah: ayahAr.numberInSurah,
        textUthmani: ayahAr.text,
        textImlaei: null,
        juz: ayahAr.juz,
        page: ayahAr.page,
        hizb: Math.ceil(ayahAr.hizbQuarter / 4), // 1..60
        rukuId: null, // v2 : on remplit la table rukus quand on ingère les longues sourates
      })
      .onConflictDoNothing();

    await db
      .insert(translations)
      .values({
        ayahId: ayahAr.number,
        source: TRANSLATION_SOURCE,
        lang: "fr",
        text: ayahFr.text,
      })
      .onConflictDoNothing();

    await db
      .insert(audioFiles)
      .values({
        ayahId: ayahAr.number,
        reciter: RECITER,
        url: audioUrlFor(n, ayahAr.numberInSurah),
        durationMs: null,
      })
      .onConflictDoNothing();
  }

  // 3. Chunk (1 par sourate pour v1 puisque le juz' 30 est court)
  const firstAyahId = ar.ayahs[0]!.number;
  const lastAyahId = ar.ayahs[ar.ayahs.length - 1]!.number;

  const existingChunk = await db
    .select({ id: chunks.id })
    .from(chunks)
    .where(and(eq(chunks.surahId, n), eq(chunks.kind, "surah")))
    .limit(1);

  if (existingChunk.length === 0) {
    await db.insert(chunks).values({
      kind: "surah",
      surahId: n,
      rukuId: null,
      label: meta.name_translit,
      orderIndex: n * 1000, // espace pour insérer des rukūʿ entre sourates en v2
      firstAyahId,
      lastAyahId,
      ayahCount: ar.numberOfAyahs,
    });
  }

  return { surah: n, ayahCount: ar.numberOfAyahs, period: ar.revelationType };
}

async function main() {
  const start = Date.now();
  console.log(`Ingestion v1 — ${V1_SURAHS.length} sourates (Al-Fātiḥa + Juz' 30)`);
  console.log(`Source contenu : alquran.cloud · Audio : everyayah Husary 128kbps\n`);

  let totalAyahs = 0;
  for (const n of V1_SURAHS) {
    const meta = SURAH_META[n];
    process.stdout.write(`  · Sourate ${n.toString().padStart(3)} ${meta.name_translit.padEnd(20)} ... `);
    try {
      const { ayahCount } = await ingestSurah(n);
      totalAyahs += ayahCount;
      console.log(`✓ ${ayahCount} ayahs`);
    } catch (err) {
      console.log(`✗ ${(err as Error).message}`);
      throw err;
    }
  }

  const duration = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `\n✓ Terminé en ${duration}s : ${V1_SURAHS.length} sourates, ${totalAyahs} ayahs.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n✗ Ingestion failed:", err);
    process.exit(1);
  });
