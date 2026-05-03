/**
 * Voix du Professeur — microcopy centralisé.
 *
 * Toute chaîne user-facing de l'app passe par ici. Règles :
 *  - Ton bienveillant et exigeant, jamais infantilisant.
 *  - Vocabulaire pédagogique : "leçon" (pas "deck"), "réciter" (pas "play"),
 *    "maîtriser" (pas "complete"), "le Professeur" (pas "the app").
 *  - Pas d'emoji, pas d'exclamations, pas de "Bravo !".
 *  - On tutoie l'élève (cohérent avec une halqa).
 */

export const teacher = {
  // Tableau du jour
  today: {
    title: "Aujourd'hui",
    subtitle: "Ce que ton Professeur te propose",
    emptyTitle: "Tout est calme",
    emptySubtitle: "Aucune leçon ne t'attend pour aujourd'hui. Reviens quand tu te sens prêt.",
    sectionInProgress: "Leçons en cours",
    sectionDue: "Récitations à faire aujourd'hui",
    sectionSuggestion: "Une nouvelle leçon t'est proposée",
    actionContinue: "Continuer cette leçon",
    actionStartNew: "Commencer une nouvelle leçon",
    actionRevise: "Réviser",
  },

  // Avec le Professeur (lesson, introduction)
  lesson: {
    title: "Avec le Professeur",
    stepListen: "Écoute d'abord",
    stepListenHint: "Ferme les yeux si tu veux. Laisse la voix entrer.",
    stepRead: "Maintenant, regarde le texte",
    stepReadHint: "Suis du regard pendant que l'audio joue.",
    stepTranslit: "Et la prononciation",
    stepTranslitHint: "La translittération apparaît sous chaque mot — tu pourras la modifier plus tard.",
    stepMeaning: "Comprends le sens",
    stepMeaningHint: "La traduction t'aidera à mémoriser : ce que tu comprends s'ancre mieux.",
    stepContext: "Le contexte",
    stepContextHint: "Quelques mots sur cette sourate / ce passage avant de répéter.",
    stepRepeat: "Maintenant, répète après moi",
    stepRepeatHint: "Verset par verset, à voix haute. Pas de pression.",
    actionDone: "J'ai compris l'introduction",
    actionDoneHint: "Tu pourras toujours revenir la revoir.",
    actionReplay: "Reprenons depuis le début",
  },

  // Vue lecture (read)
  read: {
    title: "Lire la leçon",
    subtitle: "Texte arabe, prononciation et traduction réunis. Tu peux écouter chaque verset.",
    actionOpen: "Lire",
  },

  // En autonomie (practice)
  practice: {
    title: "En autonomie",
    subtitle: "À ton rythme. Le Professeur te laisse étudier.",
    actionLoopVerse: "Boucler ce verset",
    actionToggleTranslit: "Afficher / masquer la prononciation",
    actionAddNote: "Ajouter une note",
    actionRecord: "M'enregistrer",
    actionReadyToRecite: "Je suis prêt à réciter",
    actionReadyHint: "Le Professeur t'écoutera.",
  },

  // Réciter au Professeur (recite)
  recite: {
    title: "Réciter au Professeur",
    subtitle: "Le texte est masqué. Récite de mémoire — clique pour révéler si tu hésites.",
    revealAyah: "Révéler ce verset",
    actionRateOk: "OK",
    actionRateHesitated: "Hésité",
    actionRateForgot: "Oublié",
    finalQuestion: "Penses-tu avoir maîtrisé cette leçon ?",
    finalYes: "Oui, je l'ai maîtrisée",
    finalNo: "Pas encore — je vais retravailler",
    masteredFeedback: "Bien. Cette leçon entre en révision pour les prochains jours.",
    notMasteredFeedback: "Tu peux la retravailler. Reviens quand tu te sens prêt.",
  },

  // Cycle de vie (status display)
  lessonState: {
    not_started: "Nouvelle leçon",
    introduced: "Introduction faite",
    learning: "En apprentissage",
    ready_to_recite: "Prêt à réciter",
    recited: "Récitée",
    mastered: "Maîtrisée",
  },

  queue: {
    sabaq: "Leçon nouvelle",
    sabqi: "Consolidation (7 derniers jours)",
    manzil: "Révision long terme",
  },

  // Notifications, état système
  notifications: {
    awaiting: (lessonLabel: string) => `Le Professeur t'attend pour ${lessonLabel}.`,
    saved: "Enregistré",
    syncOffline: "Hors ligne — tes modifications seront synchronisées plus tard",
    syncRecovered: "Connexion retrouvée — synchronisation en cours",
  },

  // Rating helpers (numeric → label)
  ratingLabel: (rating: 1 | 2 | 3) =>
    ({ 1: "OK", 2: "Hésité", 3: "Oublié" })[rating],
} as const;

export type Teacher = typeof teacher;
