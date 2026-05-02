/**
 * Ingestion one-shot du contenu coranique.
 *
 * Sources :
 *  - alquran.cloud /v1/surah/{n}/quran-uthmani  → texte arabe + métadonnées
 *  - alquran.cloud /v1/surah/{n}/fr.hamidullah  → traduction française Hamidullah
 *  - everyayah.com/data/Husary_128kbps/{NNN}{AAA}.mp3 → audio (URL déterministe)
 *
 * Découpage rukūʿ adaptatif :
 *  - Pour chaque sourate, on regroupe les ayahs par valeur globale `ruku`
 *  - 1 seul groupe → 1 chunk = sourate (kind="surah")
 *  - Plusieurs groupes → 1 chunk par rukūʿ (kind="ruku") + insertion dans
 *    la table `rukus` avec un numberInSurah local (1, 2, 3...)
 *
 * Idempotent : safe à re-runner. Utilise ON CONFLICT DO NOTHING là où
 * possible et vérifie l'existence avant les inserts qui n'ont pas de
 * contrainte unique naturelle (rukus, chunks).
 *
 * Usage :
 *   `npm run ingest:quran`        → ingère ALL_SURAHS (114) — long (~5 min)
 *   `INGEST_SCOPE=v1 npm run ingest:quran` → uniquement V1_SURAHS (38)
 */

import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  ayahs,
  audioFiles,
  chunks,
  rukus,
  surahs,
  translations,
} from "@/lib/db/schema";
import { ALL_SURAHS, SURAH_META, V1_SURAHS } from "@/lib/content/surah-meta";

const ALQURAN_BASE = "https://api.alquran.cloud/v1";
const TRANSLATION_SOURCE = "hamidullah_complexe_roi_fahd";
const RECITER = "husary_muallim_128";

type AyahJson = {
  number: number; // global ayah id 1..6236
  text: string;
  numberInSurah: number;
  juz: number;
  page: number;
  ruku: number; // global ruku id 1..540
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
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
  const data = (await res.json()) as { code: number; status: string; data: T };
  if (data.code !== 200) throw new Error(`API non-200 for ${url}: ${data.status}`);
  return data.data;
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

function audioUrlFor(surah: number, ayah: number): string {
  return `https://everyayah.com/data/Husary_128kbps/${pad3(surah)}${pad3(ayah)}.mp3`;
}

/**
 * Regroupe les ayahs d'une sourate par valeur globale `ruku`.
 * Renvoie un array de groupes en ordre, chaque groupe contenant :
 *  - numberInSurah local (1..N)
 *  - les ayahs du groupe (firstAyah, lastAyah, ayahCount)
 */
type RukuGroup = {
  numberInSurah: number;
  globalRuku: number;
  firstAyahId: number;
  lastAyahId: number;
  ayahCount: number;
};

function groupByRuku(ayahsArr: AyahJson[]): RukuGroup[] {
  const groups: RukuGroup[] = [];
  let current: RukuGroup | null = null;
  for (const a of ayahsArr) {
    if (!current || a.ruku !== current.globalRuku) {
      if (current) groups.push(current);
      current = {
        numberInSurah: groups.length + 1,
        globalRuku: a.ruku,
        firstAyahId: a.number,
        lastAyahId: a.number,
        ayahCount: 1,
      };
    } else {
      current.lastAyahId = a.number;
      current.ayahCount += 1;
    }
  }
  if (current) groups.push(current);
  return groups;
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

  // 1. Surah row
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

  // FK ordering :
  //   ayahs.rukuId      → rukus.id   (no FK constraint, just an int)
  //   rukus.firstAyahId → ayahs.id   (FK enforced)
  //   rukus.lastAyahId  → ayahs.id   (FK enforced)
  //   chunks.firstAyah  → ayahs.id   (FK)
  //   chunks.rukuId     → rukus.id   (FK)
  //
  // Donc l'ordre obligatoire : ayahs → rukus → chunks.

  // 2. Ayahs + translations + audio (avant rukus, pour satisfaire la FK)
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
        hizb: Math.ceil(ayahAr.hizbQuarter / 4),
        rukuId: ayahAr.ruku, // global ruku id (pas de FK enforcée côté ayahs)
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

  // 3. Rukus (les FK firstAyahId / lastAyahId pointent vers les ayahs
  //    qu'on vient de créer)
  const groups = groupByRuku(ar.ayahs);
  for (const g of groups) {
    await db
      .insert(rukus)
      .values({
        id: g.globalRuku,
        surahId: n,
        numberInSurah: g.numberInSurah,
        firstAyahId: g.firstAyahId,
        lastAyahId: g.lastAyahId,
        ayahCount: g.ayahCount,
      })
      .onConflictDoNothing();
  }

  // 4. Chunks — adaptive: 1 chunk = surah if single ruku group, else 1 per ruku
  const isMultiRuku = groups.length > 1;

  if (!isMultiRuku) {
    // Single chunk for the whole surah
    const existing = await db
      .select({ id: chunks.id })
      .from(chunks)
      .where(and(eq(chunks.surahId, n), eq(chunks.kind, "surah")))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(chunks).values({
        kind: "surah",
        surahId: n,
        rukuId: null,
        label: meta.name_translit,
        orderIndex: n * 1000,
        firstAyahId: ar.ayahs[0]!.number,
        lastAyahId: ar.ayahs[ar.ayahs.length - 1]!.number,
        ayahCount: ar.numberOfAyahs,
      });
    }
  } else {
    // One chunk per ruku
    for (const g of groups) {
      const existing = await db
        .select({ id: chunks.id })
        .from(chunks)
        .where(and(eq(chunks.surahId, n), eq(chunks.rukuId, g.globalRuku)))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(chunks).values({
          kind: "ruku",
          surahId: n,
          rukuId: g.globalRuku,
          label: `${meta.name_translit} — rukūʿ ${g.numberInSurah}/${groups.length}`,
          orderIndex: n * 1000 + g.numberInSurah,
          firstAyahId: g.firstAyahId,
          lastAyahId: g.lastAyahId,
          ayahCount: g.ayahCount,
        });
      }
    }
  }

  return { surah: n, ayahCount: ar.numberOfAyahs, chunkCount: isMultiRuku ? groups.length : 1 };
}

async function main() {
  const scope = process.env.INGEST_SCOPE === "v1" ? V1_SURAHS : ALL_SURAHS;
  const start = Date.now();
  console.log(
    `Ingestion ${scope === V1_SURAHS ? "v1 (juz' 30)" : "complète (114 sourates)"} — ${scope.length} sourates\n`,
  );

  let totalAyahs = 0;
  let totalChunks = 0;

  for (const n of scope) {
    const meta = SURAH_META[n];
    process.stdout.write(
      `  · Sourate ${n.toString().padStart(3)} ${meta.name_translit.padEnd(22)} ... `,
    );
    try {
      const { ayahCount, chunkCount } = await ingestSurah(n);
      totalAyahs += ayahCount;
      totalChunks += chunkCount;
      console.log(
        `✓ ${ayahCount} ayahs · ${chunkCount} chunk${chunkCount > 1 ? "s" : ""}`,
      );
    } catch (err) {
      console.log(`✗ ${(err as Error).message}`);
      throw err;
    }
  }

  const duration = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `\n✓ Terminé en ${duration}s : ${scope.length} sourates, ${totalAyahs} ayahs, ${totalChunks} chunks.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n✗ Ingestion failed:", err);
    process.exit(1);
  });
