import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { teacher } from "@/lib/copy/teacher";

type RouteParams = { chunkId: string };

export default async function PracticePage({
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
          {teacher.practice.title}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight">
          {teacher.practice.subtitle}
        </h1>
      </header>

      <p className="rounded-lg border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
        Page en construction. Prochaine étape de l'implémentation : audio en boucle
        par verset, vitesse réglable, masquer la translittération à la demande,
        prendre une note. Pour l'instant, retourne à la leçon.
      </p>
    </div>
  );
}
