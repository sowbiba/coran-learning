/**
 * Drizzle schema — single source of truth for the Postgres database.
 *
 * Granularités :
 *  - `ayah`   = atome de contenu (texte, audio, événements)
 *  - `chunk`  = unité pédagogique (sourate complète OU rukūʿ)
 *  - `lesson` = état d'un chunk pour un élève donné (machine à états)
 *
 * Le scheduler de murāja'a opère au niveau `lesson`, pas `ayah`.
 */

import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ──────────────────────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────────────────────

export const periodEnum = pgEnum("period", ["meccan", "medinan"]);

export const chunkKindEnum = pgEnum("chunk_kind", ["surah", "ruku"]);

export const lessonStateEnum = pgEnum("lesson_state", [
  "not_started",
  "introduced",
  "learning",
  "ready_to_recite",
  "recited",
  "mastered",
]);

export const queueEnum = pgEnum("queue", ["sabaq", "sabqi", "manzil"]);

// 1 = OK, 2 = hésité, 3 = oublié (par verset, pendant /recite)
export const ratingValues = [1, 2, 3] as const;
export type Rating = (typeof ratingValues)[number];

// ──────────────────────────────────────────────────────────────
// Contenu coranique (ingéré une fois, partagé entre tous les utilisateurs)
// ──────────────────────────────────────────────────────────────

export const surahs = pgTable("surahs", {
  id: smallint("id").primaryKey(), // 1..114, fixé par convention
  nameAr: text("name_ar").notNull(),
  nameFr: text("name_fr").notNull(),
  nameTranslit: text("name_translit").notNull(),
  period: periodEnum("period").notNull(),
  ayahCount: smallint("ayah_count").notNull(),
  introFrMd: text("intro_fr_md"), // contexte / asbāb al-nuzūl, markdown
});

export const ayahs = pgTable(
  "ayahs",
  {
    id: integer("id").primaryKey(), // 1..6236, global serial
    surahId: smallint("surah_id")
      .notNull()
      .references(() => surahs.id, { onDelete: "cascade" }),
    numberInSurah: smallint("number_in_surah").notNull(),
    textUthmani: text("text_uthmani").notNull(),
    textImlaei: text("text_imlaei"),
    juz: smallint("juz").notNull(), // 1..30
    page: smallint("page").notNull(), // 1..604 (Madinah muṣḥaf)
    hizb: smallint("hizb").notNull(), // 1..60
    rukuId: integer("ruku_id"), // FK ajoutée plus bas pour éviter cycle
  },
  (t) => [
    uniqueIndex("ayahs_surah_number_idx").on(t.surahId, t.numberInSurah),
    index("ayahs_juz_idx").on(t.juz),
    index("ayahs_page_idx").on(t.page),
    index("ayahs_ruku_idx").on(t.rukuId),
  ],
);

export const rukus = pgTable(
  "rukus",
  {
    id: integer("id").primaryKey(), // 1..540
    surahId: smallint("surah_id")
      .notNull()
      .references(() => surahs.id, { onDelete: "cascade" }),
    numberInSurah: smallint("number_in_surah").notNull(),
    firstAyahId: integer("first_ayah_id")
      .notNull()
      .references(() => ayahs.id),
    lastAyahId: integer("last_ayah_id")
      .notNull()
      .references(() => ayahs.id),
    ayahCount: smallint("ayah_count").notNull(),
  },
  (t) => [uniqueIndex("rukus_surah_number_idx").on(t.surahId, t.numberInSurah)],
);

/**
 * Un chunk = une "leçon" du point de vue pédagogique :
 *   - kind = "surah" pour les sourates ≤ 1 page (juz' 30 surtout)
 *   - kind = "ruku"  pour les portions des longues sourates
 * On stocke un row par chunk pour pouvoir les ordonner et les référencer
 * uniformément depuis `lessons`.
 */
export const chunks = pgTable(
  "chunks",
  {
    id: serial("id").primaryKey(),
    kind: chunkKindEnum("kind").notNull(),
    surahId: smallint("surah_id")
      .notNull()
      .references(() => surahs.id, { onDelete: "cascade" }),
    rukuId: integer("ruku_id").references(() => rukus.id, { onDelete: "cascade" }),
    label: text("label").notNull(), // ex. "Al-Mulk" ou "Al-Baqarah, rukūʿ 3/40"
    orderIndex: integer("order_index").notNull(), // ordre de progression naturel (mushaf order)
    firstAyahId: integer("first_ayah_id")
      .notNull()
      .references(() => ayahs.id),
    lastAyahId: integer("last_ayah_id")
      .notNull()
      .references(() => ayahs.id),
    ayahCount: smallint("ayah_count").notNull(),
  },
  (t) => [
    index("chunks_surah_idx").on(t.surahId),
    index("chunks_order_idx").on(t.orderIndex),
  ],
);

export const translations = pgTable(
  "translations",
  {
    ayahId: integer("ayah_id")
      .notNull()
      .references(() => ayahs.id, { onDelete: "cascade" }),
    source: text("source").notNull(), // ex. "hamidullah_complexe_roi_fahd"
    lang: text("lang").notNull(), // "fr"
    text: text("text").notNull(),
  },
  (t) => [primaryKey({ columns: [t.ayahId, t.source, t.lang] })],
);

/**
 * Translittération latine, mot par mot.
 * `wordsJson` est un array de { ar, latin, lemma? } dans l'ordre du verset.
 * `editedByUser`: vrai si l'utilisateur a personnalisé la translit pour ce verset.
 */
export const transliterations = pgTable("transliterations", {
  ayahId: integer("ayah_id")
    .primaryKey()
    .references(() => ayahs.id, { onDelete: "cascade" }),
  wordsJson: jsonb("words_json").$type<TransliterationWord[]>().notNull(),
  editedByUser: boolean("edited_by_user").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TransliterationWord = {
  ar: string; // mot arabe original
  latin: string; // translittération latine
};

export const audioFiles = pgTable(
  "audio_files",
  {
    ayahId: integer("ayah_id")
      .notNull()
      .references(() => ayahs.id, { onDelete: "cascade" }),
    reciter: text("reciter").notNull(), // ex. "husary_muallim_128"
    url: text("url").notNull(),
    durationMs: integer("duration_ms"),
  },
  (t) => [primaryKey({ columns: [t.ayahId, t.reciter] })],
);

// ──────────────────────────────────────────────────────────────
// Auth.js (NextAuth v5) — schéma standard du Drizzle adapter
// ──────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date", withTimezone: true }),
  image: text("image"),
  // préférences propres au domaine
  defaultReciter: text("default_reciter").notNull().default("husary_muallim_128"),
  manzilJuzPerCycle: smallint("manzil_juz_per_cycle").notNull().default(1),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ──────────────────────────────────────────────────────────────
// État pédagogique de chaque élève
// ──────────────────────────────────────────────────────────────

/**
 * Une `lesson` = état d'un chunk pour un élève.
 * Cycle de vie (voir lib/lessons/state.ts) :
 *  not_started → introduced → learning ⇄ ready_to_recite → recited → mastered
 *
 * `queue` ne devient non-null qu'à partir du moment où la leçon a un état
 * actif dans le scheduler de murāja'a.
 */
export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chunkId: integer("chunk_id")
      .notNull()
      .references(() => chunks.id, { onDelete: "cascade" }),
    state: lessonStateEnum("state").notNull().default("not_started"),
    queue: queueEnum("queue"), // null tant que la leçon n'est pas dans une queue active
    fsrsStateJson: jsonb("fsrs_state_json"), // alimenté par ts-fsrs au passage en manzil
    introducedAt: timestamp("introduced_at", { withTimezone: true }),
    lastPracticedAt: timestamp("last_practiced_at", { withTimezone: true }),
    lastRecitedAt: timestamp("last_recited_at", { withTimezone: true }),
    masteredAt: timestamp("mastered_at", { withTimezone: true }),
    nextDueAt: timestamp("next_due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("lessons_user_chunk_idx").on(t.userId, t.chunkId),
    index("lessons_user_due_idx").on(t.userId, t.nextDueAt),
    index("lessons_user_queue_idx").on(t.userId, t.queue),
  ],
);

export const ayahNotes = pgTable(
  "ayah_notes",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ayahId: integer("ayah_id")
      .notNull()
      .references(() => ayahs.id, { onDelete: "cascade" }),
    bodyMd: text("body_md").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ayah_notes_user_ayah_idx").on(t.userId, t.ayahId)],
);

export const recordings = pgTable(
  "recordings",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ayahId: integer("ayah_id")
      .notNull()
      .references(() => ayahs.id, { onDelete: "cascade" }),
    blobUrl: text("blob_url").notNull(), // local IndexedDB blob URL ou Vercel Blob URL si plus tard
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("recordings_user_ayah_idx").on(t.userId, t.ayahId)],
);

export const recitationEvents = pgTable(
  "recitation_events",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ayahId: integer("ayah_id")
      .notNull()
      .references(() => ayahs.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
    rating: smallint("rating").notNull(), // 1..3, voir ratingValues
    recordingId: uuid("recording_id").references(() => recordings.id, {
      onDelete: "set null",
    }),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("recitation_events_user_ts_idx").on(t.userId, t.ts),
    index("recitation_events_lesson_idx").on(t.lessonId),
  ],
);

// ──────────────────────────────────────────────────────────────
// Relations (pour les requêtes Drizzle ergonomiques)
// ──────────────────────────────────────────────────────────────

export const surahsRelations = relations(surahs, ({ many }) => ({
  ayahs: many(ayahs),
  rukus: many(rukus),
  chunks: many(chunks),
}));

export const ayahsRelations = relations(ayahs, ({ one, many }) => ({
  surah: one(surahs, { fields: [ayahs.surahId], references: [surahs.id] }),
  ruku: one(rukus, { fields: [ayahs.rukuId], references: [rukus.id] }),
  translations: many(translations),
  audio: many(audioFiles),
}));

export const chunksRelations = relations(chunks, ({ one, many }) => ({
  surah: one(surahs, { fields: [chunks.surahId], references: [surahs.id] }),
  ruku: one(rukus, { fields: [chunks.rukuId], references: [rukus.id] }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  user: one(users, { fields: [lessons.userId], references: [users.id] }),
  chunk: one(chunks, { fields: [lessons.chunkId], references: [chunks.id] }),
}));

// SQL helper utility (`getCurrentTimestamp` etc.) — kept inline for clarity
export const sqlHelpers = { now: sql`now()` };

// Types inférés pour utilisation côté app
export type Surah = typeof surahs.$inferSelect;
export type Ayah = typeof ayahs.$inferSelect;
export type Ruku = typeof rukus.$inferSelect;
export type Chunk = typeof chunks.$inferSelect;
export type Translation = typeof translations.$inferSelect;
export type Transliteration = typeof transliterations.$inferSelect;
export type AudioFile = typeof audioFiles.$inferSelect;
export type User = typeof users.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type AyahNote = typeof ayahNotes.$inferSelect;
export type Recording = typeof recordings.$inferSelect;
export type RecitationEvent = typeof recitationEvents.$inferSelect;

export type LessonState = (typeof lessonStateEnum.enumValues)[number];
export type Queue = (typeof queueEnum.enumValues)[number];
