import "server-only";
import { auth } from "@/lib/auth/auth";

/**
 * Liste des admins. Lit ADMIN_EMAILS en env (comma-separated).
 * Par défaut : seul bibisaw@gmail.com.
 */
function getAdminEmails(): Set<string> {
  const env = process.env.ADMIN_EMAILS;
  const raw = env && env.length > 0 ? env : "bibisaw@gmail.com";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Renvoie true si l'utilisateur connecté fait partie des ADMIN_EMAILS.
 * Utilisé par la page /admin/users pour gating.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return false;
  return getAdminEmails().has(email);
}
