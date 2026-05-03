/**
 * Auth.js v5 — config centrale.
 *
 * Branchement :
 *   - Adapter Drizzle, sessions stockées en DB (table `sessions`)
 *   - Provider Google OAuth uniquement (le user contrôle les 2 bouts,
 *     pas besoin d'autre provider pour cette app perso)
 *   - allowDangerousEmailAccountLinking : permet de réutiliser le user
 *     existant (mode mono-user) quand on se connecte avec le même email
 *     Google. Sans risque ici puisque mono-utilisateur.
 *
 * Env requis dans .env.local :
 *   AUTH_SECRET=<openssl rand -base64 32>
 *   AUTH_GOOGLE_ID=...
 *   AUTH_GOOGLE_SECRET=...
 *
 * Cf. https://authjs.dev/getting-started/installation pour le setup
 * détaillé du provider Google côté Google Cloud Console.
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      // Permet de lier le compte Google à un user créé en mono-user mode
      // avec le même email. Sans risque : app perso, on contrôle les deux.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    /**
     * Garde-fou de routing. Toute requête non publique passe par ici via
     * le middleware.
     */
    authorized: async ({ auth, request }) => {
      const path = request.nextUrl.pathname;

      // Routes publiques : page de sign-in et endpoints API d'auth
      if (path.startsWith("/sign-in") || path.startsWith("/api/auth")) {
        return true;
      }

      // Routes API métier : 401 JSON propre si pas de session, plutôt
      // qu'une redirection HTML qui casse les fetch() du client.
      if (path.startsWith("/api/")) {
        if (!auth) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return true;
      }

      // Pages : protégées (Auth.js redirige automatiquement vers /sign-in)
      return !!auth;
    },
    /**
     * Avec strategy=database, session.user.id est exposé automatiquement
     * par l'adapter — on n'a rien à faire ici. On garde le callback prêt
     * pour ajouter des claims propres au domaine plus tard.
     */
    session: ({ session }) => session,
  },
});
