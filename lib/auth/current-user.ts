import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

/**
 * Identifie l'utilisateur courant.
 *
 * Pour l'instant : **mode mono-utilisateur** — on s'assure qu'un user existe
 * pour `SOLO_USER_EMAIL` (bibisaw@gmail.com par défaut) et on retourne son ID.
 * Sera remplacé par `auth().user.id` quand Auth.js sera branché.
 *
 * Idempotent : la 1ère requête crée la row si elle n'existe pas.
 */
export async function getCurrentUserId(): Promise<string> {
  const email = process.env.SOLO_USER_EMAIL ?? "bibisaw@gmail.com";

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) return existing[0]!.id;

  const inserted = await db
    .insert(users)
    .values({
      email,
      name: "sowbiba",
    })
    .returning({ id: users.id });

  return inserted[0]!.id;
}
