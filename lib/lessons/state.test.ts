import { describe, expect, it } from "vitest";
import type { LessonState } from "@/lib/db/schema";
import { canRecite, isActive, isMastered, transition } from "./state";

describe("transition", () => {
  describe("introduce", () => {
    it("démarre une leçon depuis not_started", () => {
      const r = transition("not_started", "introduce");
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.nextState).toBe("introduced");
        expect(r.touch).toContain("introducedAt");
      }
    });

    it("permet de réécouter l'intro depuis introduced (idempotent)", () => {
      const r = transition("introduced", "introduce");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.nextState).toBe("introduced");
    });

    it("rejette introduce depuis learning ou plus avancé", () => {
      const learningR = transition("learning", "introduce");
      expect(learningR.ok).toBe(false);
      const masteredR = transition("mastered", "introduce");
      expect(masteredR.ok).toBe(false);
    });
  });

  describe("review_introduction", () => {
    it("ne change pas l'état si la leçon est avancée", () => {
      const states: LessonState[] = [
        "introduced",
        "learning",
        "ready_to_recite",
        "recited",
        "mastered",
      ];
      for (const s of states) {
        const r = transition(s, "review_introduction");
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.nextState).toBe(s);
      }
    });

    it("démarre la leçon depuis not_started", () => {
      const r = transition("not_started", "review_introduction");
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.nextState).toBe("introduced");
        expect(r.touch).toContain("introducedAt");
      }
    });
  });

  describe("practice", () => {
    it("passe de introduced à learning", () => {
      const r = transition("introduced", "practice");
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.nextState).toBe("learning");
        expect(r.touch).toContain("lastPracticedAt");
      }
    });

    it("permet de re-pratiquer depuis recited (après échec)", () => {
      const r = transition("recited", "practice");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.nextState).toBe("learning");
    });

    it("est idempotent depuis learning", () => {
      const r = transition("learning", "practice");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.nextState).toBe("learning");
    });

    it("rejette practice depuis not_started", () => {
      // L'élève doit d'abord rencontrer la leçon avec le Professeur
      const r = transition("not_started", "practice");
      expect(r.ok).toBe(false);
    });
  });

  describe("complete_recitation", () => {
    it("passe de ready_to_recite à recited", () => {
      const r = transition("ready_to_recite", "complete_recitation");
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.nextState).toBe("recited");
        expect(r.touch).toContain("lastRecitedAt");
      }
    });

    it("accepte une récitation directe depuis learning (raccourci)", () => {
      const r = transition("learning", "complete_recitation");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.nextState).toBe("recited");
    });

    it("rejette depuis not_started ou introduced (rien à réciter)", () => {
      expect(transition("not_started", "complete_recitation").ok).toBe(false);
      expect(transition("introduced", "complete_recitation").ok).toBe(false);
    });
  });

  describe("master / reject_mastery", () => {
    it("master uniquement depuis recited", () => {
      const r = transition("recited", "master");
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.nextState).toBe("mastered");
        expect(r.touch).toContain("masteredAt");
      }
    });

    it("master depuis learning est invalide (il faut réciter d'abord)", () => {
      expect(transition("learning", "master").ok).toBe(false);
    });

    it("reject_mastery renvoie à learning", () => {
      const r = transition("recited", "reject_mastery");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.nextState).toBe("learning");
    });
  });

  describe("revive_for_review", () => {
    it("réveille une leçon mastered pour révision", () => {
      const r = transition("mastered", "revive_for_review");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.nextState).toBe("ready_to_recite");
    });

    it("rejette pour les états non-mastered", () => {
      expect(transition("learning", "revive_for_review").ok).toBe(false);
      expect(transition("recited", "revive_for_review").ok).toBe(false);
    });
  });

  describe("restart", () => {
    it("revient à introduced depuis n'importe quel état", () => {
      const states: LessonState[] = [
        "not_started",
        "introduced",
        "learning",
        "ready_to_recite",
        "recited",
        "mastered",
      ];
      for (const s of states) {
        const r = transition(s, "restart");
        expect(r.ok).toBe(true);
        if (r.ok) {
          expect(r.nextState).toBe("introduced");
          expect(r.touch).toContain("introducedAt");
          expect(r.touch).toContain("clearMasteredAt");
        }
      }
    });
  });
});

describe("predicates", () => {
  it("canRecite est faux pour not_started et mastered", () => {
    expect(canRecite("not_started")).toBe(false);
    expect(canRecite("mastered")).toBe(false);
  });

  it("canRecite est vrai dès qu'il y a quelque chose à réciter", () => {
    expect(canRecite("introduced")).toBe(true);
    expect(canRecite("learning")).toBe(true);
    expect(canRecite("ready_to_recite")).toBe(true);
    expect(canRecite("recited")).toBe(true);
  });

  it("isMastered identifie l'état mastered", () => {
    expect(isMastered("mastered")).toBe(true);
    expect(isMastered("recited")).toBe(false);
  });

  it("isActive est faux pour not_started et mastered", () => {
    expect(isActive("not_started")).toBe(false);
    expect(isActive("mastered")).toBe(false);
    expect(isActive("introduced")).toBe(true);
    expect(isActive("learning")).toBe(true);
  });
});

describe("scénarios complets", () => {
  it("élève débutant : not_started → maîtrisée du premier coup", () => {
    let s: LessonState = "not_started";
    for (const a of [
      "introduce",
      "practice",
      "ready_to_recite",
      "complete_recitation",
      "master",
    ] as const) {
      const r = transition(s, a);
      expect(r.ok).toBe(true);
      if (r.ok) s = r.nextState;
    }
    expect(s).toBe("mastered");
  });

  it("récitation ratée : retour à learning, deuxième essai réussi", () => {
    let s: LessonState = "ready_to_recite";

    // Premier essai
    let r = transition(s, "complete_recitation");
    expect(r.ok).toBe(true);
    if (r.ok) s = r.nextState;
    expect(s).toBe("recited");

    // Pas maîtrisée, retour à learning
    r = transition(s, "reject_mastery");
    expect(r.ok).toBe(true);
    if (r.ok) s = r.nextState;
    expect(s).toBe("learning");

    // L'élève re-pratique, redemande à réciter, complete, master
    for (const a of ["ready_to_recite", "complete_recitation", "master"] as const) {
      r = transition(s, a);
      expect(r.ok).toBe(true);
      if (r.ok) s = r.nextState;
    }
    expect(s).toBe("mastered");
  });

  it("révision : mastered → revive → recite → master", () => {
    let s: LessonState = "mastered";

    let r = transition(s, "revive_for_review");
    expect(r.ok).toBe(true);
    if (r.ok) s = r.nextState;
    expect(s).toBe("ready_to_recite");

    for (const a of ["complete_recitation", "master"] as const) {
      r = transition(s, a);
      expect(r.ok).toBe(true);
      if (r.ok) s = r.nextState;
    }
    expect(s).toBe("mastered");
  });
});
