import { toPublicDisplayName } from "./display-name.util";

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
