import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BackLink } from "@/components/page-header";
import { isCurrentUserAdmin } from "@/lib/auth/is-admin";
import {
  getAdminGlobalStats,
  listAdminUserStats,
} from "@/lib/admin/users-stats";

export const dynamic = "force-dynamic";

const FR_DATE = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function AdminUsersPage() {
  // Gating : si pas admin, on renvoie un 404 (cache l'existence de la page).
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) notFound();

  const [global, rows] = await Promise.all([
    getAdminGlobalStats(),
    listAdminUserStats(),
  ]);

  return (
    <div className="quiet">
      <BackLink href="/" label="Retour au tableau du jour" />

      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight">
          Utilisateurs et activité
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vue d'ensemble réservée aux administrateurs.
        </p>
      </header>

      {/* Stats globales */}
      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Utilisateurs" value={global.totalUsers} />
        <StatCard label="Leçons en cours" value={global.totalLessonsActive} />
        <StatCard label="Leçons maîtrisées" value={global.totalLessonsMastered} />
        <StatCard label="Notes" value={global.totalNotes} />
        <StatCard label="Enregistrements" value={global.totalRecordings} />
        <StatCard label="Récitations" value={global.totalRecitations} />
      </section>

      {/* Liste utilisateurs */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
          {rows.length} utilisateur{rows.length > 1 ? "s" : ""}
        </h2>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun utilisateur inscrit pour l'instant.</p>
        ) : (
          <div className="grid gap-3">
            {rows.map((u) => (
              <Card key={u.id}>
                <CardHeader className="space-y-2">
                  <div className="flex items-center gap-3">
                    {u.image ? (
                      <img
                        src={u.image}
                        alt=""
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-full ring-1 ring-border/50"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10 text-sm">
                        {(u.name ?? u.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg leading-tight tracking-tight">
                        {u.name ?? u.email.split("@")[0]}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="text-right text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                      <p>Dernière activité</p>
                      <p className="mt-0.5 text-xs normal-case tracking-normal text-foreground">
                        {u.lastActivity ? FR_DATE.format(u.lastActivity) : "—"}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-5">
                    <Metric label="En cours" value={u.lessonsActive} />
                    <Metric label="Maîtrisées" value={u.lessonsMastered} />
                    <Metric label="Notes" value={u.notes} />
                    <Metric label="Audios" value={u.recordings} />
                    <Metric label="Récitations" value={u.recitations} />
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 font-display text-3xl tabular-nums tracking-tight">
          {value.toLocaleString("fr-FR")}
        </p>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 font-display text-base tabular-nums">{value}</dd>
    </div>
  );
}
