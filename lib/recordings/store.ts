/**
 * Stockage local des enregistrements vocaux.
 *
 * Toutes les récitations enregistrées sont conservées dans IndexedDB
 * (Dexie). On ne les pousse pas au serveur en v1 — l'utilisateur peut
 * les rejouer pour s'auto-corriger, mais elles restent privées et
 * locales.
 *
 * Format :
 *  - audio/webm;codecs=opus (Chrome / Firefox / Edge)
 *  - audio/mp4              (iOS Safari, qui ne supporte pas webm)
 */

import Dexie, { type Table } from "dexie";

export type LocalRecording = {
  id?: number;
  ayahId: number;
  blob: Blob;
  durationMs: number;
  mimeType: string;
  createdAt: number;
};

class RecordingsDB extends Dexie {
  recordings!: Table<LocalRecording, number>;

  constructor() {
    super("coran-recordings");
    this.version(1).stores({
      recordings: "++id, ayahId, createdAt",
    });
  }
}

let _db: RecordingsDB | null = null;
function db(): RecordingsDB | null {
  if (typeof window === "undefined") return null;
  if (!_db) _db = new RecordingsDB();
  return _db;
}

export async function saveRecording(rec: Omit<LocalRecording, "id" | "createdAt">): Promise<number | null> {
  const handle = db();
  if (!handle) return null;
  return handle.recordings.add({ ...rec, createdAt: Date.now() }) as Promise<number>;
}

export async function listRecordingsForAyah(ayahId: number): Promise<LocalRecording[]> {
  const handle = db();
  if (!handle) return [];
  return handle.recordings.where("ayahId").equals(ayahId).reverse().sortBy("createdAt");
}

export async function deleteRecording(id: number): Promise<void> {
  const handle = db();
  if (!handle) return;
  await handle.recordings.delete(id);
}

/**
 * Choisit le meilleur mimeType supporté par le navigateur.
 * iOS Safari ne supporte que mp4 — on doit s'y adapter.
 */
export function pickRecordingMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "audio/webm";
}
