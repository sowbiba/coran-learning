import { describe, expect, it } from "vitest";
import { parseNotionSurahPage } from "./notion-translit-parser";

const FATIHA_RAW = `### <span color="purple">**Verset 1**</span>
## <span color="green">**بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ<br>**</span>
<span color="blue">*Bismillaahir Rahmaanir Raheem*</span>
<span color="brown">Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux.</span>
---
### <span color="purple">**Verset 2**</span>
## <span color="green">**ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَـٰلَمِینَ<br>**</span>
<span color="blue">*Alhamdu lillaahi Rabbil 'aalameen*</span>
<span color="brown">Louange à Allah, Seigneur de l'univers.</span>
---
### <span color="purple">**Verset 3**</span>
## <span color="green">**ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ<br>**</span>
<span color="blue">*Ar-Rahmaanir-Raheem*</span>
<span color="brown">Le Tout Miséricordieux, le Très Miséricordieux,</span>
---`;

describe("parseNotionSurahPage", () => {
  it("extrait les versets, numéros et translittérations", () => {
    const verses = parseNotionSurahPage(FATIHA_RAW);
    expect(verses).toHaveLength(3);
    expect(verses[0]).toEqual({
      numberInSurah: 1,
      translit: "Bismillaahir Rahmaanir Raheem",
    });
    expect(verses[1]?.numberInSurah).toBe(2);
    expect(verses[2]?.translit).toBe("Ar-Rahmaanir-Raheem");
  });

  it("retourne une liste vide si pas de versets", () => {
    expect(parseNotionSurahPage("")).toEqual([]);
    expect(parseNotionSurahPage("Some random content")).toEqual([]);
  });

  it("ignore les blocs sans translit même avec un Verset N", () => {
    const partial = `### <span color="purple">**Verset 1**</span>
## <span color="green">**بِسۡمِ**</span>
<span color="brown">Au nom d'Allah</span>
---`;
    expect(parseNotionSurahPage(partial)).toEqual([]);
  });
});
