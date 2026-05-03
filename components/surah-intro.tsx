/**
 * Bloc d'introduction d'une sourate (contexte / asbāb al-nuzūl / thème).
 *
 * Affiché en haut de /lesson et /read si `surahs.intro_fr_md` est non null.
 * Format markdown très simple (paragraphes + emphases) — on n'utilise pas
 * de markdown renderer pour éviter une dépendance ; les sauts de ligne
 * doubles deviennent des paragraphes, c'est largement suffisant.
 */
export function SurahIntro({ markdown }: { markdown: string | null }) {
  if (!markdown || markdown.trim().length === 0) return null;

  const paragraphs = markdown
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className="mb-8 rounded-lg border border-border/40 bg-card/30 p-5">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Contexte
      </p>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </section>
  );
}
