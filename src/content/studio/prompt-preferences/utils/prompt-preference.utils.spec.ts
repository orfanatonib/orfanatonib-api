import {
  effectivePrompt,
  validatePromptPreference,
} from "./prompt-preference.utils";

describe("prompt-preference.utils", () => {
  it("valida tamanho mínimo e máximo", () => {
    expect(validatePromptPreference("curto")).toBe("TOO_SHORT");
    expect(validatePromptPreference("   curto    ")).toBe("TOO_SHORT");
    expect(
      validatePromptPreference("Use exemplos do cotidiano de um abrigo."),
    ).toBeNull();
    expect(validatePromptPreference("a".repeat(6_001))).toBe("TOO_LONG");
  });
  it("recusa pedido de conteúdo sensível", () => {
    expect(
      validatePromptPreference(
        "Inclua o CPF e o endereço da criança no texto da lição",
      ),
    ).toBe("SENSITIVE");
  });
  it("prévia só soma a personalização quando ela existe", () => {
    expect(effectivePrompt("BASE", null)).toBe("BASE");
    expect(effectivePrompt("BASE", "  ")).toBe("BASE");
    expect(effectivePrompt("BASE", "meu texto")).toBe(
      "BASE\n\nPERSONALIZAÇÃO DO ADMINISTRADOR:\nmeu texto",
    );
  });
});
