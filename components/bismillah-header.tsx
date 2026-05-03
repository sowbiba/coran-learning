/**
 * En-tête ornementale qui affiche la Basmala au-dessus du premier verset
 * de la sourate (toutes sauf Al-Fātiḥa et At-Tawba).
 *
 * Visuellement plus discret que les versets eux-mêmes : taille moyenne,
 * couleur muted, fines bordures horizontales pour le détacher.
 */
export function BismillahHeader({ text }: { text: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-muted-foreground/70">
      <span className="h-px flex-1 bg-border" aria-hidden />
      <p
        lang="ar"
        dir="rtl"
        className="arabic text-center text-xl leading-relaxed sm:text-2xl"
      >
        {text}
      </p>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}
