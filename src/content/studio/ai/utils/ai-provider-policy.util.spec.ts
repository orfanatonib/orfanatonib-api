import { containsSensitiveContentInstruction } from "./ai-provider-policy.util";

/** Regressão do padrão de telefone: antes casava QUALQUER sequência de 8 dígitos. */
describe("containsSensitiveContentInstruction — telefone", () => {
  it.each([
    "ligue para (92) 99123-4567",
    "ligue 92 99123-4567",
    "fone +55 92 99123-4567",
    "contato 99123-4567",
    "contato (92) 3123-4567",
    "whatsapp 92991234567",
    "telefone 9231234567",
  ])("bloqueia %s", (text) => {
    expect(containsSensitiveContentInstruction(text)).toBe(true);
  });

  it.each([
    "versículos 12345678 e 20262027",
    "referência 2026-2027",
    "capítulo 12 verso 34 total 56789",
    "em 18/11/2026 às 10:30",
    "código 12345678",
    "ano de 2026 com 100000 pessoas",
  ])("NÃO bloqueia (falso positivo antigo) %s", (text) => {
    expect(containsSensitiveContentInstruction(text)).toBe(false);
  });

  it("os demais padrões continuam valendo (CPF, e-mail, prontuário)", () => {
    expect(containsSensitiveContentInstruction("cpf 123.456.789-09")).toBe(
      true,
    );
    expect(containsSensitiveContentInstruction("fulano@exemplo.com")).toBe(
      true,
    );
    expect(containsSensitiveContentInstruction("prontuário da criança")).toBe(
      true,
    );
  });
});
