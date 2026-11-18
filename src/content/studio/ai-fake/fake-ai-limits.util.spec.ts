import {
  estimateTokens,
  FakeAiFailure,
  FakeFailureCounter,
  FakeTokenQuota,
  isFakeModeAllowed,
  parseFakeDirective,
} from "./fake-ai-limits.util";

describe("parseFakeDirective", () => {
  it.each([
    ["Escreva a aula [[fake:429]]", FakeAiFailure.RATE_LIMIT, 429, true],
    ["[[fake:quota]]", FakeAiFailure.QUOTA, 429, false],
    ["x [[FAKE:Timeout]] y", FakeAiFailure.TIMEOUT, null, true],
    ["[[fake:moderation]]", FakeAiFailure.MODERATION, 400, false],
    ["[[fake:500]]", FakeAiFailure.SERVER_ERROR, 500, true],
    ["[[fake:schema]]", FakeAiFailure.INVALID_SCHEMA, 200, false],
    ["[[fake:network]]", FakeAiFailure.NETWORK, null, true],
  ])("%s", (text, failure, status, retryable) => {
    const d = parseFakeDirective(text);
    expect(d?.descriptor).toMatchObject({
      failure,
      httpStatus: status,
      retryable,
    });
  });

  it("429 simula Retry-After; quota não", () => {
    expect(
      parseFakeDirective("[[fake:429]]")?.descriptor.retryAfterSeconds,
    ).toBe(2);
    expect(
      parseFakeDirective("[[fake:quota]]")?.descriptor.retryAfterSeconds,
    ).toBeUndefined();
  });

  it("sem diretiva ou com nome desconhecido: null", () => {
    expect(parseFakeDirective("texto normal")).toBeNull();
    expect(parseFakeDirective("[[fake:inexistente]]")).toBeNull();
  });

  it("[[fake:429:2]] falha 2 vezes e depois funciona", () => {
    const d = parseFakeDirective("[[fake:429:2]]")!;
    const counter = new FakeFailureCounter();
    expect([1, 2, 3].map(() => counter.shouldFail("job-1", d))).toEqual([
      true,
      true,
      false,
    ]);
    expect(counter.shouldFail("job-2", d)).toBe(true);
  });

  it("sem contagem, falha sempre", () => {
    const d = parseFakeDirective("[[fake:500]]")!;
    const counter = new FakeFailureCounter();
    expect([1, 2, 3, 4].every(() => counter.shouldFail("j", d))).toBe(true);
  });
});

describe("FakeTokenQuota", () => {
  it("consome até acabar e não consome quando falta saldo", () => {
    const q = new FakeTokenQuota(100);
    expect(q.consume(60)).toBe(true);
    expect(q.consume(50)).toBe(false);
    expect(q.left).toBe(40);
    expect(q.consume(40)).toBe(true);
    expect(q.consume(1)).toBe(false);
    q.reset();
    expect(q.left).toBe(100);
  });
});

describe("estimateTokens e modo fake", () => {
  it("estimativa é determinística e nunca zero", () => {
    expect(estimateTokens("")).toBe(1);
    expect(estimateTokens("a".repeat(40))).toBe(10);
  });

  it("fake só é permitido fora de produção", () => {
    expect(isFakeModeAllowed("fake", "local")).toBe(true);
    expect(isFakeModeAllowed("fake", "dev")).toBe(true);
    expect(isFakeModeAllowed("fake", "prod")).toBe(false);
    expect(isFakeModeAllowed("fake", "Production")).toBe(false);
    expect(isFakeModeAllowed("live", "local")).toBe(false);
    expect(isFakeModeAllowed(undefined, "local")).toBe(false);
  });
});
