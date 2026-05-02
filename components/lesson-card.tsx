import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { teacher } from "@/lib/copy/teacher";
import { cn } from "@/lib/utils";
import type { MockTodayItem } from "@/lib/mock/today-fixtures";

type Props = {
  item: MockTodayItem;
  emphasis?: "normal" | "primary";
  primaryAction?: string;
  secondaryAction?: string;
};

export function LessonCard({
  item,
  emphasis = "normal",
  primaryAction,
  secondaryAction,
}: Props) {
  const stateLabel = teacher.lessonState[item.state];
  const ayahCue = item.ayahRange;
  const subtle = computeSubtle(item);

  return (
    <Card
      className={cn(
        "group transition-colors",
        emphasis === "primary" && "border-foreground/20",
      )}
    >
      <CardHeader className="space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-2xl tracking-tight">{item.chunkLabel}</h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            Sourate {item.surahNumber}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {item.surahName} · {ayahCue}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          <span className="text-muted-foreground">{stateLabel}</span>
          {subtle ? <span className="text-muted-foreground"> · {subtle}</span> : null}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant={emphasis === "primary" ? "default" : "outline"} size="sm">
            {primaryAction ?? teacher.today.actionContinue}
          </Button>
          {secondaryAction ? (
            <Button variant="ghost" size="sm">
              {secondaryAction}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function computeSubtle(item: MockTodayItem): string | null {
  if (item.lastPracticedAt) {
    const days = daysSince(item.lastPracticedAt);
    if (days === 0) return "Pratiquée aujourd'hui";
    if (days === 1) return "Pratiquée hier";
    return `Pratiquée il y a ${days} jours`;
  }
  if (item.introducedAt) {
    const days = daysSince(item.introducedAt);
    if (days === 0) return "Introduite aujourd'hui";
    if (days === 1) return "Introduite hier";
    return `Introduite il y a ${days} jours`;
  }
  return null;
}

function daysSince(date: Date): number {
  const ms = Date.now() - date.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
