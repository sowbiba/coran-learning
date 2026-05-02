import { Separator } from "@/components/ui/separator";
import { LessonCard } from "@/components/lesson-card";
import { teacher } from "@/lib/copy/teacher";
import {
  mockTodayItems,
  mockNewLessonSuggestion,
  type MockTodayItem,
} from "@/lib/mock/today-fixtures";

export default function Today() {
  const inProgress = mockTodayItems.filter((i) => i.state !== "mastered");
  const due = mockTodayItems.filter((i) => i.state === "mastered");
  const isEmpty = inProgress.length === 0 && due.length === 0;

  return (
    <div className="quiet">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {teacher.today.title}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight">
          {teacher.today.subtitle}
        </h1>
      </header>

      {isEmpty ? <EmptyState /> : null}

      {inProgress.length > 0 ? (
        <Section title={teacher.today.sectionInProgress}>
          {inProgress.map((item, idx) => (
            <LessonCard
              key={item.lessonId}
              item={item}
              emphasis={idx === 0 ? "primary" : "normal"}
              primaryAction={primaryActionFor(item)}
              secondaryAction="Revoir l'introduction"
            />
          ))}
        </Section>
      ) : null}

      {due.length > 0 ? (
        <>
          <Separator className="my-10" />
          <Section title={teacher.today.sectionDue}>
            {due.map((item) => (
              <LessonCard
                key={item.lessonId}
                item={item}
                primaryAction={teacher.today.actionRevise}
                secondaryAction="Repousser à demain"
              />
            ))}
          </Section>
        </>
      ) : null}

      <Separator className="my-10" />

      <section className="space-y-4">
        <p className="text-sm text-muted-foreground">{teacher.today.sectionSuggestion}</p>
        <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-6">
          <h3 className="font-display text-2xl tracking-tight">
            {mockNewLessonSuggestion.chunkLabel}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {mockNewLessonSuggestion.surahName} · {mockNewLessonSuggestion.ayahRange}
          </p>
          <p className="mt-4 text-sm text-foreground/70">
            {teacher.today.actionStartNew} avec ton Professeur — environ 15 minutes.
          </p>
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">{title}</h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-10 text-center">
      <p className="font-display text-2xl tracking-tight">{teacher.today.emptyTitle}</p>
      <p className="mt-2 text-sm text-muted-foreground">{teacher.today.emptySubtitle}</p>
    </div>
  );
}

function primaryActionFor(item: MockTodayItem): string {
  if (item.state === "ready_to_recite") return "Réciter au Professeur";
  if (item.state === "introduced") return "Revoir avec le Professeur";
  return teacher.today.actionContinue;
}
