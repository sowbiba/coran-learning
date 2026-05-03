import { describe, expect, it } from "vitest";
import {
  BISMILLAH_DISPLAY,
  shouldDisplaySeparateBismillah,
  stripBismillah,
} from "./bismillah";

describe("shouldDisplaySeparateBismillah", () => {
  it("returns false for Al-Fatiha (1) and At-Tawba (9)", () => {
    expect(shouldDisplaySeparateBismillah(1)).toBe(false);
    expect(shouldDisplaySeparateBismillah(9)).toBe(false);
  });
  it("returns true for any other surah", () => {
    expect(shouldDisplaySeparateBismillah(2)).toBe(true);
    expect(shouldDisplaySeparateBismillah(78)).toBe(true);
    expect(shouldDisplaySeparateBismillah(114)).toBe(true);
  });
});

describe("stripBismillah", () => {
  it("strips Basmala prefix from An-Nas verse 1 (Uthmani)", () => {
    const input =
      "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ";
    const out = stripBismillah(input);
    expect(out.startsWith("قُلْ")).toBe(true);
  });

  it("strips Basmala prefix with hamzatul-wasl form (ٱ)", () => {
    const input = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ ٱقۡتَرَبَتِ ٱلسَّاعَةُ";
    const out = stripBismillah(input);
    expect(out.startsWith("ٱقۡتَرَبَتِ")).toBe(true);
  });

  it("leaves Al-Fatiha verse 1 untouched (Basmala IS the verse)", () => {
    // Si on appelle stripBismillah sur Al-Fatiha v1, on retournerait une
    // chaîne vide. Notre logique métier appelle stripBismillah uniquement
    // pour les sourates où shouldDisplaySeparateBismillah=true, donc ce
    // cas est protégé en amont. On vérifie quand même que le garde-fou
    // empêche un strip catastrophique.
    const fatihaV1 = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
    const out = stripBismillah(fatihaV1);
    // Le garde-fou retourne l'original quand le résultat ferait < 3 chars
    expect(out).toBe(fatihaV1);
  });

  it("leaves verses without Basmala prefix untouched", () => {
    const input = "مَلِكِ ٱلنَّاسِ";
    expect(stripBismillah(input)).toBe(input);
  });

  it("does not strip if text doesn't start with ب", () => {
    const input = "وَٱلسَّمَاءِ ذَاتِ ٱلْبُرُوجِ";
    expect(stripBismillah(input)).toBe(input);
  });

  it("BISMILLAH_DISPLAY constant is non-empty Arabic", () => {
    expect(BISMILLAH_DISPLAY.length).toBeGreaterThan(10);
    expect(/[؀-ۿ]/.test(BISMILLAH_DISPLAY)).toBe(true);
  });
});
