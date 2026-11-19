import { toFullDisplayName, toPublicDisplayName } from "./display-name.util";

describe("toPublicDisplayName", () => {
  it("primeiro nome + inicial do último sobrenome", () => {
    expect(toPublicDisplayName("Maria Souza Lima")).toBe("Maria L.");
    expect(toPublicDisplayName("  joão   silva ")).toBe("joão S.");
  });

  it("nome único é mantido; vazio ou nulo vira null", () => {
    expect(toPublicDisplayName("Ana")).toBe("Ana");
    expect(toPublicDisplayName("   ")).toBeNull();
    expect(toPublicDisplayName(null)).toBeNull();
    expect(toPublicDisplayName(undefined)).toBeNull();
  });

  it("não vaza o nome completo nem caracteres de controle", () => {
    const shown = toPublicDisplayName("Ana\nPaula Oliveira");
    expect(shown).toBe("Ana O.");
    expect(shown).not.toContain("Oliveira");
  });
});

describe("toFullDisplayName", () => {
  it("mantém o nome completo, normalizando espaços", () => {
    expect(toFullDisplayName("  Maria   Souza  Lima ")).toBe("Maria Souza Lima");
    expect(toFullDisplayName("Ana")).toBe("Ana");
  });
  it("vazio ou nulo vira null e controle de caractere não passa", () => {
    expect(toFullDisplayName("   ")).toBeNull();
    expect(toFullDisplayName(null)).toBeNull();
    expect(toFullDisplayName(undefined)).toBeNull();
    expect(toFullDisplayName("Ana\nPaula")).toBe("Ana Paula");
  });
});
