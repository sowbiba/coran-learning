# Le Coran — avec ton Professeur

Application web personnelle (PWA) pour mémoriser et comprendre le Saint Coran, en français, sur plusieurs années — du déchiffrage jusqu'au Hifz complet.

L'idée centrale : l'app joue le rôle d'un **professeur de Coran (شيخ)**, et vous êtes son élève. Pas de deck, pas de streak, pas de points — des leçons, des récitations, et un professeur qui se souvient de ce que vous devez réviser.

## Comment ça marche

Chaque leçon est un **chunk** naturel du Coran : une sourate entière si elle est courte, sinon un rukūʿ (unité thématique de ~8–12 versets). Une leçon se vit en trois moments, à son rythme — une leçon peut s'étaler sur plusieurs jours :

- **Avec le Professeur** (`/lesson`) — introduction guidée : lecture mot à mot, sens, traduction (Hamidullah), translittération, audio verset par verset.
- **En autonomie** (`/practice`) — pratique libre : écoute, répétition, texte masqué progressivement.
- **Réciter au Professeur** (`/recite`) — récitation évaluée, qui fait avancer la leçon vers la maîtrise.

À côté des leçons :

- **Lecture** (`/read`) — lire n'importe quel passage, avec audio et traduction, sans objectif de mémorisation.
- **Catalogue** (`/catalogue`) — vue d'ensemble des 114 sourates et de sa progression.
- **Statistiques** (`/stats`) — ce qui est appris, en cours, à réviser.

### Révision (murājaʿa)

Le planificateur de révision suit les cycles traditionnels du Hifz avec trois files : **sabaq** (la leçon récente), **sabqi** (les leçons des derniers jours) et **manzil** (le répertoire ancien, planifié par répétition espacée [FSRS](https://github.com/open-spaced-repetition/ts-fsrs)). C'est la mémoire à long terme du Professeur : c'est lui qui décide quoi réviser aujourd'hui.

### Hors ligne

C'est une PWA installable : l'audio écouté est mis en cache, et les actions effectuées hors ligne (progression, notes) sont stockées localement (IndexedDB) puis synchronisées au retour du réseau.

## Sources et remerciements

- Texte arabe et découpage en rukūʿ : [Tanzil](https://tanzil.net/)
- Traduction française : Muhammad Hamidullah, via [QuranEnc](https://quranenc.com/)
- Audio : récitation de Cheikh Mahmoud Khalil al-Husary, via [everyayah.com](https://everyayah.com/)
- Police coranique : KFGQPC (Complexe du Roi Fahd pour l'impression du Noble Coran)

## Stack technique

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Auth.js v5 (Google) · Neon Postgres + Drizzle ORM · TanStack Query · Dexie (outbox hors ligne) · ts-fsrs · déployé sur Vercel.

## Développement

```bash
npm install
npm run dev
```

Prérequis : un fichier `.env.local` avec `DATABASE_URL` (Neon Postgres), `AUTH_SECRET`, `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`, et `ADMIN_EMAILS` pour l'accès admin.

La base doit ensuite être créée et remplie :

```bash
npm run db:push        # applique le schéma Drizzle
npm run ingest:quran   # texte arabe, traduction, découpage en chunks
npm run ingest:segments # timings audio mot à mot
```

Autres commandes utiles :

```bash
npm run test       # tests unitaires (vitest)
npm run typecheck  # tsc --noEmit
npm run lint
```

## Licence

Code sous licence [MIT](LICENSE). Le texte coranique, les traductions et l'audio appartiennent à leurs sources respectives (voir ci-dessus).
