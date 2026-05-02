"use client";

import { useEffect, useState, useTransition } from "react";
import { NotebookPen, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { sendOrEnqueue } from "@/lib/sync/outbox";
import { cn } from "@/lib/utils";

type Props = {
  ayahId: number;
  ayahNumberInSurah: number;
  surahNameTranslit: string;
  /** Note initiale (server-rendered). Le composant l'édite et la PUT au save. */
  initialBody?: string;
};

/**
 * Sheet d'édition d'une note libre par verset.
 *  - Bouton trigger : icône NotebookPen, légèrement plus opaque s'il y a une note
 *  - Sheet droite avec textarea + boutons Save / Supprimer
 *  - PUT /api/notes/[ayahId] via l'outbox (offline-friendly)
 *  - "Supprimer" envoie un body vide (le repo détecte et delete)
 */
export function NoteEditor({
  ayahId,
  ayahNumberInSurah,
  surahNameTranslit,
  initialBody,
}: Props) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(initialBody ?? "");
  const [submitting, startTransition] = useTransition();
  const hasNote = (initialBody ?? "").trim().length > 0;

  // Resync l'état local si on rouvre la sheet (au cas où elle a été modifiée
  // côté serveur entre-temps via router.refresh()).
  useEffect(() => {
    if (open) setBody(initialBody ?? "");
  }, [open, initialBody]);

  function save() {
    startTransition(async () => {
      try {
        await sendOrEnqueue({
          url: `/api/notes/${ayahId}`,
          method: "PUT",
          body: { bodyMd: body },
        });
        toast.success("Note enregistrée");
        setOpen(false);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await sendOrEnqueue({
          url: `/api/notes/${ayahId}`,
          method: "DELETE",
          body: {},
        });
        toast.success("Note supprimée");
        setBody("");
        setOpen(false);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={hasNote ? "Voir / éditer ma note" : "Ajouter une note"}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "h-8 px-2 text-muted-foreground hover:text-foreground",
          hasNote && "text-foreground",
        )}
      >
        <NotebookPen className="size-4" />
        {hasNote ? <span className="ms-1 text-xs">Note</span> : null}
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md gap-4 px-6 py-8 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">
            Ma note — verset {ayahNumberInSurah}
          </SheetTitle>
          <SheetDescription>
            {surahNameTranslit} · Pour ancrer la mémorisation : asbāb al-nuzūl,
            mots clés, parallèles avec d'autres versets, etc. Markdown accepté.
          </SheetDescription>
        </SheetHeader>

        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Écris ta note ici. Elle ne sera visible que par toi."
          className="min-h-[40vh] font-sans text-base leading-relaxed"
          autoFocus
        />

        <SheetFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={remove}
            disabled={submitting || !hasNote}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
            <span className="ms-1">Supprimer</span>
          </Button>
          <div className="flex gap-2">
            <SheetClose className={buttonVariants({ variant: "outline", size: "sm" })}>
              <X className="size-4" />
              <span className="ms-1">Annuler</span>
            </SheetClose>
            <Button onClick={save} disabled={submitting} size="sm">
              <Save className="size-4" />
              <span className="ms-1">{submitting ? "..." : "Enregistrer"}</span>
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
