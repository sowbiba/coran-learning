"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type CatalogueChunk = {
  id: number;
  label: string;
  ayahCount: number;
  surahId: number;
  surahNameTranslit: string;
  surahNameFr: string;
  juz: number;
};

type Props = {
  chunks: CatalogueChunk[];
};

/**
 * Liste des chunks groupés par juz' avec recherche client-side.
 *
 * - Le filtre matche sans diacritiques (Hamīda → Hamida) sur le nom
 *   translit, le nom français, et le numéro de sourate.
 * - Quand un filtre est actif, on saute les juz' vides (et on cache la
 *   nav d'ancres puisqu'elle n'aurait plus de sens).
 */
export function CatalogueList({ chunks }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (q.length === 0) return chunks;
    return chunks.filter((c) => {
      return (
        normalize(c.surahNameTranslit).includes(q) ||
        normalize(c.surahNameFr).includes(q) ||
        normalize(c.label).includes(q) ||
        String(c.surahId).startsWith(q)
      );
    });
  }, [chunks, query]);

  const byJuz = useMemo(() => {
    const m = new Map<number, CatalogueChunk[]>();
    for (const c of filtered) {
      const list = m.get(c.juz) ?? [];
      list.push(c);
      m.set(c.juz, list);
    }
    return m;
  }, [filtered]);

  const juzList = useMemo(() => Array.from(byJuz.keys()).sort((a, b) => a - b), [byJuz]);
  const isFiltering = query.trim().length > 0;

  return (
    <>
      <div className="relative mb-8">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Chercher une sourate (nom français, translit, numéro)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="ps-9"
          autoFocus
        />
        {isFiltering ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Effacer la recherche"
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {!isFiltering && juzList.length > 0 ? (
        <nav className="mb-10 flex flex-wrap gap-1.5 text-xs">
          {juzList.map((j) => (
            <a
              key={j}
              href={`#juz-${j}`}
              className="rounded-md border border-border/60 px-2 py-1 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              Juz' {j}
            </a>
          ))}
        </nav>
      ) : null}

      {isFiltering ? (
        <p className="mb-6 text-sm text-muted-foreground">
          {filtered.length} {filtered.length > 1 ? "résultats" : "résultat"} pour
          {' "'}
          <span className="text-foreground">{query}</span>
          {'"'}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 bg-card/40 p-6 text-center text-sm text-muted-foreground">
          Aucune sourate ne correspond à ta recherche.
        </p>
      ) : null}

      <div className={cn("space-y-12", isFiltering && "space-y-3")}>
        {isFiltering
          ? filtered.map((c) => <ChunkRow key={c.id} chunk={c} showJuz />)
          : juzList.map((juz) => (
              <JuzSection key={juz} juz={juz} chunks={byJuz.get(juz) ?? []} />
            ))}
      </div>
    </>
  );
}

function JuzSection({ juz, chunks }: { juz: number; chunks: CatalogueChunk[] }) {
  return (
    <section id={`juz-${juz}`} className="scroll-mt-8">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
          Juzʾ {juz}
        </p>
        <h2 className="mt-1 font-display text-2xl tracking-tight">
          {chunks.length} leçon{chunks.length > 1 ? "s" : ""}
        </h2>
      </header>
      <div className="grid gap-3">
        {chunks.map((c) => (
          <ChunkRow key={c.id} chunk={c} />
        ))}
      </div>
      <Separator className="mt-12" />
    </section>
  );
}

function ChunkRow({ chunk: c, showJuz }: { chunk: CatalogueChunk; showJuz?: boolean }) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-xl tracking-tight">{c.label}</h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            Sourate {c.surahId}
            {showJuz ? ` · Juz' ${c.juz}` : ""}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {c.surahNameFr} · {c.ayahCount} versets
        </p>
      </CardHeader>
      <CardContent>
        <Link
          href={`/lesson/${c.id}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Avec le Professeur
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Normalise pour la recherche : lowercase + suppression des diacritiques
 * (NFD + suppression des marks). Permet de matcher "Fātiḥa" en tapant "fatiha".
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}
