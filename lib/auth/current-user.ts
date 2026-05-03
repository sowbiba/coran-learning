import "server-only";
import { auth } from "@/lib/auth/auth";

/**
 * Renvoie l'ID de l'utilisateur courant. Lance si pas de session — le
 * middleware Auth.js redirige normalement vers /sign-in avant qu'on
 * arrive ici, donc cette erreur ne devrait remonter qu'en cas de bug.
 *
 * Pour les pages App Router, ce throw deviendra une 500 — accepté
 * puisque l'invariant est "tout user qui voit une page est connecté".
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    throw new Error(
      "getCurrentUserId() appelé sans session active. Vérifier que le middleware Auth.js est bien monté.",
    );
  }
  return id;
}
