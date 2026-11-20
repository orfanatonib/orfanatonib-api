import {
  buildCoverImageInstructions,
  coverHeadline,
  fallbackCoverBrief,
  headlineFits,
  parseCoverBrief,
  simplifyTitle,
} from "./content-cover.utils";

const source = {
  theme: "Davi e Golias: a coragem de quem confia em Deus",
  biblicalReferences: "1 Samuel 17",
  canonicalObjective: "Ensinar que Deus dá coragem.",
};

describe("capa do material", () => {
  it("encurta o título sem terminar em conectivo e deixa em maiúsculas", () => {
    expect(simplifyTitle(source.theme)).toBe("Davi e Golias");
    expect(coverHeadline("O bom pastor e as ovelhas perdidas", "x")).toBe(
      "O BOM PASTOR",
    );
    expect(
      headlineFits(
        simplifyTitle(
          "Uma frase muito longa que não cabe no card de apresentação",
        ),
      ),
    ).toBe(true);
  });

  it("aceita um briefing completo e recusa o que não tem personagem ou cena", () => {
    const ok = parseCoverBrief(
      {
        headline: "Davi e Golias",
        character: { name: "Davi", appearance: "menino pastor, túnica azul" },
        scene: "Davi com a funda diante do gigante.",
        palette: ["azul-céu", "verde-pasto"],
      },
      source,
    );
    expect("brief" in ok && ok.brief.headline).toBe("DAVI E GOLIAS");
    expect(
      parseCoverBrief({ headline: "x", character: {}, scene: "s" }, source),
    ).toEqual({
      problem: "personagem principal ausente",
    });
    expect(
      parseCoverBrief(
        { headline: "x", character: { name: "a", appearance: "b" }, scene: "" },
        source,
      ),
    ).toEqual({ problem: "cena ausente" });
  });

  it("sem briefing, o prompt usa a referência bíblica e soletra o título", () => {
    const brief = fallbackCoverBrief(source);
    const text = buildCoverImageInstructions(
      brief,
      source,
      "com um cajado",
    ).join("\n");
    expect(text).toContain("1 Samuel 17");
    expect(text).toContain("D A V I");
    expect(text).toContain("ORIENTAÇÃO EXTRA DO ADMINISTRADOR: com um cajado");
  });
});
