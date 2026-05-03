/**
 * Footer global, sobre. Affiche le crédit créateur + un mailto.
 *
 * Utilise mt-auto via le flex column du <body> + <main className="flex-1">
 * pour rester collé en bas de viewport quand le contenu est court, et
 * naturellement en bas de page quand il est long.
 */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
      <p>
        Créé par{" "}
        <a
          href="mailto:sowbiba@hotmail.com"
          className="underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          Ibrahima SOW
        </a>
      </p>
    </footer>
  );
}
