/**
 * Mini menu utilisateur pour le coin haut-droit.
 *
 * Affiche l'avatar Google + un bouton de déconnexion. Server component
 * qui lit la session — n'apparaît que si l'utilisateur est connecté.
 */

import { auth, signOut } from "@/lib/auth/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export async function UserMenu() {
  const session = await auth();
  const user = session?.user;
  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      {user.image ? (
        // Avatar Google. On garde <img> simple plutôt que next/image pour
        // éviter de configurer un domaine remote (lh3.googleusercontent.com).
        <img
          src={user.image}
          alt={user.name ?? user.email ?? "Utilisateur"}
          width={28}
          height={28}
          className="h-7 w-7 rounded-full ring-1 ring-border/50"
        />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/10 text-xs">
          {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
        </div>
      )}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/sign-in" });
        }}
      >
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          aria-label="Se déconnecter"
        >
          <LogOut className="size-3.5" />
        </Button>
      </form>
    </div>
  );
}
