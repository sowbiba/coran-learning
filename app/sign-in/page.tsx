import { signIn, auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Page de connexion. Si l'utilisateur est déjà connecté, on le renvoie
 * direct au tableau du jour. Sinon, un seul bouton : Continuer avec
 * Google.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");

  const { callbackUrl } = await searchParams;

  return (
    <div className="quiet flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="max-w-sm space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Bienvenue
          </p>
          <h1 className="font-display text-4xl leading-tight tracking-tight">
            Le Coran, accompagné
          </h1>
          <p className="text-sm text-muted-foreground">
            Mémoriser et comprendre le Saint Coran, accompagné par un compagnon quotidien.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl ?? "/" });
          }}
        >
          <Button type="submit" size="lg" className="w-full">
            Continuer avec Google
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          Tu utilises ton compte Google uniquement pour te reconnaître. Aucune
          donnée n'est partagée.
        </p>
      </div>
    </div>
  );
}
