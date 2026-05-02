import { AudioPlayer } from "@/components/audio-player";
import type { ChunkAyah } from "@/lib/content/quran";

type Props = {
  ayah: ChunkAyah;
  /** Vrai pour Al-Fātiḥa ayah 1 — la Basmala, on l'affiche un peu différemment. */
  isBasmala?: boolean;
};

export function AyahRow({ ayah, isBasmala }: Props) {
  return (
    <article className="space-y-3 py-6">
      <header className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {isBasmala ? "Basmala" : `Verset ${ayah.numberInSurah}`}
        </span>
        {ayah.audioUrl ? (
          <AudioPlayer src={ayah.audioUrl} label="Écouter" />
        ) : null}
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
    </article>
  );
}
