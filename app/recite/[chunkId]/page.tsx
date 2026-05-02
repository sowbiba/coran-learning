import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { teacher } from "@/lib/copy/teacher";

type RouteParams = { chunkId: string };

export default async function RecitePage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { chunkId } = await params;
  return (
    <div className="quiet">
      <Link
        href={`/lesson/${chunkId}`}
        className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-6 -ms-2 text-muted-foreground hover:text-foreground`}
      >
        <ArrowLeft className="me-1 size-4" />
        Retour à la leçon
      </Link>

      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {teacher.recite.title}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight">
          {teacher.recite.subtitle}
        </h1>
      </header>

      <p className="rounded-lg border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
        Page en construction. Prochaine étape : texte arabe masqué par défaut,
        révélation verset par verset, rating bref par verset, décision finale
        « maîtrisée ? » qui transitionne l'état de la leçon.
      </p>
    </div>
  );
}
