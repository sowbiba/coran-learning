import { ChevronRight } from "lucide-react";

/**
 * Bloc d'introduction d'une sourate (contexte / asbāb al-nuzūl / thème).
 *
 * Affiché en haut de /lesson et /read si `surahs.intro_fr_md` est non null.
 * Format markdown très simple (paragraphes) — on n'utilise pas de
 * markdown renderer pour éviter une dépendance ; les sauts de ligne
 * doubles deviennent des paragraphes, c'est largement suffisant.
 *
 * Repliable et **replié par défaut** : le contexte est utile mais on
 * ne veut pas qu'il pousse les versets sous le pli. Un clic suffit pour
 * dérouler.
 */
export function SurahIntro({ markdown }: { markdown: string | null }) {
  if (!markdown || markdown.trim().length === 0) return null;

  const paragraphs = markdown
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <details className="group mb-8 rounded-lg border border-border/40 bg-card/30">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3 transition-transform group-open:rotate-90" />
        Contexte
      </summary>
      <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-foreground/85">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </details>
  );
}
