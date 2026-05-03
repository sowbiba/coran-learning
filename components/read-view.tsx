"use client";

import { AudioPlayer } from "@/components/audio-player";
import { BismillahHeader } from "@/components/bismillah-header";
import { NoteEditor } from "@/components/note-editor";
import { Separator } from "@/components/ui/separator";
import type { ChunkAyah } from "@/lib/content/quran";

type Props = {
  ayahs: ChunkAyah[];
  surahNameTranslit: string;
  bismillah: string | null;
};

/**
 * Vue "Lire la leçon" — tout est visible :
 *   arabe + translit + traduction + note + audio par verset.
 *
 * Pas d'étapes, pas de masquage, pas de rating. Sert au survol /
 * relecture / référence quand l'élève veut "voir" la leçon en entier
 * sans le côté guidé d'`/lesson` ni le découpage 1-verset d'`/practice`.
 */
export function ReadView({ ayahs, surahNameTranslit, bismillah }: Props) {
  return (
    <div className="space-y-6">
      {bismillah ? <BismillahHeader text={bismillah} /> : null}

      <ol className="divide-y divide-border/40">
        {ayahs.map((ayah) => (
          <li key={ayah.id} className="space-y-3 py-6 first:pt-0 last:pb-0">
            <header className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Verset {ayah.numberInSurah}
              </span>
              <div className="flex items-center gap-1">
                <NoteEditor
                  ayahId={ayah.id}
                  ayahNumberInSurah={ayah.numberInSurah}
                  surahNameTranslit={surahNameTranslit}
                  initialBody={ayah.noteBodyMd ?? ""}
                />
                {ayah.audioUrl ? <AudioPlayer src={ayah.audioUrl} label="Écouter" /> : null}
              </div>
            </header>

            <p
              lang="ar"
              dir="rtl"
              className="arabic text-balance text-3xl leading-[2.4] text-foreground"
            >
              {ayah.textUthmani}
            </p>

            {ayah.transliteration && ayah.transliteration.length > 0 ? (
              <p className="translit text-sm">
                {ayah.transliteration.map((w, i) => (
                  <span key={i} className="me-2 inline-block">
                    {w.latin}
                  </span>
                ))}
              </p>
            ) : null}

            {ayah.textFr ? (
              <p className="text-base leading-relaxed text-foreground/80">{ayah.textFr}</p>
            ) : null}

            {ayah.noteBodyMd ? (
              <blockquote className="mt-2 border-s-2 border-foreground/30 ps-3 text-sm text-muted-foreground italic">
                {ayah.noteBodyMd}
              </blockquote>
            ) : null}
          </li>
        ))}
      </ol>

      <Separator />
    </div>
  );
}
