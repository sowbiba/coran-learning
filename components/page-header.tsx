/**
 * Headers partagés entre les pages — un BackLink réutilisable et un
 * ChunkPageHeader pour les 4 pages chunk-scoped (/lesson, /practice,
 * /recite, /read) qui ont la même structure : eyebrow + title + meta +
 * nom arabe optionnel + slot trailing.
 *
 * /stats et /catalogue gardent leur header custom (contenu unique) mais
 * utilisent BackLink pour le retour.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-6 -ms-2 text-muted-foreground hover:text-foreground`}
    >
      <ArrowLeft className="me-1 size-4" />
      {label}
    </Link>
  );
}

type ChunkPageHeaderProps = {
  /** Petit label en haut, uppercase tracking — ex. "Avec le Professeur" */
  eyebrow: string;
  /** Gros titre — ex. "Al-Fātiḥa" */
  title: string;
  /** Ligne secondaire optionnelle — ex. "L'ouverture · 7 versets · Mecquoise" */
  subtitle?: string;
  /**
   * Nom arabe ornemental affiché en RTL en dessous, muted. Décoratif,
   * marqué aria-hidden (le titre translit suffit aux screen readers).
   */
  arabicName?: string;
  /** Slot pour un CTA aligné à droite du bloc title, ex. <Link>Lire</Link> */
  trailing?: React.ReactNode;
};

export function ChunkPageHeader({
  eyebrow,
  title,
  subtitle,
  arabicName,
  trailing,
}: ChunkPageHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
      {arabicName ? (
        <p
          lang="ar"
          dir="rtl"
          className="arabic mt-4 text-2xl leading-loose text-muted-foreground/80"
          aria-hidden
        >
          {arabicName}
        </p>
      ) : null}
    </header>
  );
}
