import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { teacher } from "@/lib/copy/teacher";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getUserStats } from "@/lib/stats/repo";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const userId = await getCurrentUserId();
  const stats = await getUserStats(userId);

  const masteredPct = (stats.masteredAyahs / stats.totalAyahs) * 100;
  const startedPct = (stats.startedAyahs / stats.totalAyahs) * 100;

  return (
    <div className="quiet">
      <Link
        href="/"
        className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-6 -ms-2 text-muted-foreground hover:text-foreground`}
      >
        <ArrowLeft className="me-1 size-4" />
        Retour au tableau du jour
      </Link>

      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Progression
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight">
          {stats.masteredAyahs.toLocaleString("fr-FR")}
          <span className="ms-2 text-2xl text-muted-foreground">
            / {stats.totalAyahs.toLocaleString("fr-FR")} versets maîtrisés
          </span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {masteredPct.toFixed(2)}% du Coran. Tu as commencé {stats.startedChunks} leçons.
        </p>
        <div className="mt-4 space-y-2">
          <Progress value={masteredPct} aria-label="Progression maîtrisée" />
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            En apprentissage : {((startedPct - masteredPct)).toFixed(1)}% supplémentaires
          </p>
        </div>
      </header>

      {/* Queues breakdown */}
      <section className="mb-12">
        <h2 className="mb-4 text-sm uppercase tracking-[0.15em] text-muted-foreground">
          File de révision
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <QueueCard
            label={teacher.queue.sabaq}
            count={stats.byQueue.sabaq}
            hint="Leçons actives en apprentissage"
          />
          <QueueCard
            label={teacher.queue.sabqi}
            count={stats.byQueue.sabqi}
            hint="Consolidation des 7 derniers jours"
          />
          <QueueCard
            label={teacher.queue.manzil}
            count={stats.byQueue.manzil}
            hint="Acquis longue durée (FSRS)"
          />
        </div>
      </section>

      {/* Last 30 days activity */}
      <section className="mb-12">
        <h2 className="mb-4 text-sm uppercase tracking-[0.15em] text-muted-foreground">
          Récitations — 30 derniers jours
        </h2>
        <RecentDaysChart data={stats.recentDays} />
      </section>

      {/* Per-surah progress */}
      {stats.perSurah.length > 0 ? (
        <section>
          <h2 className="mb-4 text-sm uppercase tracking-[0.15em] text-muted-foreground">
            Sourates en cours ({stats.perSurah.length})
          </h2>
          <div className="space-y-3">
            {stats.perSurah.map((s) => (
              <SurahProgressRow key={s.surahId} surah={s} />
            ))}
          </div>
        </section>
      ) : (
        <p className="rounded-lg border border-dashed border-border/60 bg-card/40 p-6 text-center text-sm text-muted-foreground">
          Tu n'as encore commencé aucune leçon. Va sur le tableau du jour
          pour démarrer.
        </p>
      )}
    </div>
  );
}

function QueueCard({
  label,
  count,
  hint,
}: {
  label: string;
  count: number;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader className="space-y-1 px-4 pt-4 pb-2">
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </p>
        <p className="font-display text-3xl tabular-nums">{count}</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function SurahProgressRow({
  surah,
}: {
  surah: {
    surahId: number;
    surahNameTranslit: string;
    surahNameFr: string;
    totalAyahs: number;
    startedAyahs: number;
    masteredAyahs: number;
  };
}) {
  const masteredPct = (surah.masteredAyahs / surah.totalAyahs) * 100;
  const startedPct = (surah.startedAyahs / surah.totalAyahs) * 100;

  return (
    <div className="rounded-lg border border-border/40 bg-card/40 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-display text-lg">{surah.surahNameTranslit}</p>
          <p className="text-xs text-muted-foreground">
            {surah.surahNameFr} · sourate {surah.surahId}
          </p>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {surah.masteredAyahs} / {surah.totalAyahs} maîtrisés
        </p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="relative h-full">
          <div
            className="absolute inset-y-0 left-0 bg-foreground/30"
            style={{ width: `${startedPct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-foreground"
            style={{ width: `${masteredPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function RecentDaysChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="rounded-lg border border-border/40 bg-card/30 p-4">
      <div className="flex h-32 items-end gap-[3px]">
        {data.map((d) => {
          const heightPct = (d.count / max) * 100;
          const isToday = d === data[data.length - 1];
          return (
            <div
              key={d.day}
              title={`${formatDay(d.day)} — ${d.count} récitation${d.count > 1 ? "s" : ""}`}
              className="group flex flex-1 flex-col items-center justify-end"
            >
              <div
                className={
                  isToday
                    ? "w-full rounded-sm bg-foreground transition-all"
                    : d.count > 0
                      ? "w-full rounded-sm bg-foreground/50 transition-all group-hover:bg-foreground"
                      : "w-full rounded-sm bg-muted-foreground/15"
                }
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatDay(data[0]!.day)}</span>
        <span className="tabular-nums">
          Total : {total} récitation{total > 1 ? "s" : ""}
        </span>
        <span>Aujourd'hui</span>
      </div>
    </div>
  );
}

function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
