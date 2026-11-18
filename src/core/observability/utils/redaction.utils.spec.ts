import {
  pickResourceId,
  REDACTED,
  redactText,
  redactValue,
  stripQueryString,
} from "./redaction.utils";

const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl";

describe("redactText (tabela)", () => {
  it.each([
    ["JWT em texto", `falha com ${JWT} no header`, JWT],
    ["Bearer", "Authorization: Bearer abc.def-123", "abc.def-123"],
    [
      "e-mail",
      "usuário ana.silva@exemplo.com.br não achado",
      "ana.silva@exemplo.com.br",
    ],
    ["CPF formatado", "cpf 123.456.789-09 inválido", "123.456.789-09"],
    ["CPF sem máscara", "cpf 12345678909 inválido", "12345678909"],
    ["telefone com DDD", "ligar (92) 98155-1234", "98155-1234"],
  ])("remove %s", (_nome, entrada, segredo) => {
    const saida = redactText(entrada);
    expect(saida).not.toContain(segredo);
    expect(saida).toContain(REDACTED);
  });

  it("mantém texto sem dado sensível", () => {
    expect(redactText("Abrigo não encontrado")).toBe("Abrigo não encontrado");
  });
});

describe("stripQueryString", () => {
  it("remove a query (token/e-mail ficam fora do log)", () => {
    expect(
      stripQueryString("/auth/reset-password/validate?token=abc&e=a@b.com"),
    ).toBe("/auth/reset-password/validate");
    expect(stripQueryString("/shelters")).toBe("/shelters");
  });
});

describe("redactValue", () => {
  it("mascara chaves sensíveis em qualquer nível e variações de caixa/separador", () => {
    const out = redactValue({
      name: "Ana",
      Password: "x",
      nested: { refresh_token: "y", list: [{ "e-mail": "a@b.com", ok: 1 }] },
    }) as Record<string, unknown>;
    expect(out.name).toBe("Ana");
    expect(out.Password).toBe(REDACTED);
    expect(JSON.stringify(out)).not.toContain("a@b.com");
    expect(JSON.stringify(out)).not.toContain('"y"');
    expect(JSON.stringify(out)).toContain('"ok":1');
  });

  it("Error vira nome + mensagem redigida (sem stack)", () => {
    const out = redactValue(new Error("falhou para ana@x.com")) as {
      message: string;
      stack?: string;
    };
    expect(out.message).not.toContain("ana@x.com");
    expect(out.stack).toBeUndefined();
  });

  it("limita a profundidade (objeto cíclico não explode)", () => {
    const cyc: Record<string, unknown> = {};
    cyc.self = cyc;
    expect(() => redactValue(cyc)).not.toThrow();
  });
});

describe("pickResourceId", () => {
  const uuid = "3f2b8a52-1c3e-4d6f-9a1b-0e5c7d9f1a22";
  it("aceita UUID em param permitido", () => {
    expect(pickResourceId({ shelterId: uuid })).toBe(uuid);
  });
  it("recusa texto livre (nome, e-mail) em param permitido", () => {
    expect(pickResourceId({ id: "ana@x.com" })).toBeUndefined();
    expect(pickResourceId({ id: "Maria da Silva" })).toBeUndefined();
  });
  it("aceita chave simples de flag só no param `key`", () => {
    expect(pickResourceId({ key: "shelter_pagelas" })).toBe("shelter_pagelas");
    expect(pickResourceId({ id: "shelter_pagelas" })).toBeUndefined();
  });
  it("ignora params fora da allowlist", () => {
    expect(pickResourceId({ cpf: uuid })).toBeUndefined();
  });
});
