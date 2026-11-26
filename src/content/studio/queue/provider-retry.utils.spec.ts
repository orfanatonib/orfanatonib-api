import {
  backoffDelayMs,
  decideRetry,
  DEFAULT_RETRY_POLICY,
  parseRetryAfterMs,
  RetryPolicy,
} from "./provider-retry.utils";

const noJitter: RetryPolicy = { ...DEFAULT_RETRY_POLICY, jitterRatio: 0 };
const middle = () => 0.5; // jitter = 0

describe("parseRetryAfterMs", () => {
  const now = Date.parse("2026-11-18T12:00:00Z");
  it.each([
    ["120", 120_000],
    [" 2.5 ", 2_500],
    [3, 3_000],
    ["Wed, 18 Nov 2026 12:00:10 GMT", 10_000],
    ["Wed, 18 Nov 2026 11:00:00 GMT", 0],
  ])("%s -> %s ms", (input, expected) => {
    expect(parseRetryAfterMs(input, now)).toBe(expected);
  });

  it.each([[null], [undefined], [""], ["abc"], [-1], [Number.NaN]])(
    "%s -> null",
    (input) => {
      expect(parseRetryAfterMs(input as never, now)).toBeNull();
    },
  );
});

describe("backoffDelayMs", () => {
  it("dobra a cada tentativa e respeita o teto", () => {
    expect(backoffDelayMs(1, noJitter, middle)).toBe(1_000);
    expect(backoffDelayMs(2, noJitter, middle)).toBe(2_000);
    expect(backoffDelayMs(3, noJitter, middle)).toBe(4_000);
    expect(backoffDelayMs(10, noJitter, middle)).toBe(30_000);
  });

  it("jitter fica dentro da faixa configurada", () => {
    const policy: RetryPolicy = { ...DEFAULT_RETRY_POLICY, jitterRatio: 0.25 };
    expect(backoffDelayMs(2, policy, () => 0)).toBe(1_500);
    expect(backoffDelayMs(2, policy, () => 1)).toBe(2_500);
  });
});

describe("decideRetry", () => {
  it("tenta de novo com o backoff quando não há dica", () => {
    expect(decideRetry(1, null, noJitter, middle)).toEqual({
      retry: true,
      delayMs: 1_000,
    });
  });

  it("Retry-After maior que o backoff manda; menor não encurta o backoff", () => {
    expect(decideRetry(1, 5_000, noJitter, middle)).toEqual({
      retry: true,
      delayMs: 5_000,
    });
    expect(decideRetry(2, 500, noJitter, middle)).toEqual({
      retry: true,
      delayMs: 2_000,
    });
  });

  it("não dorme quando a dica passa do teto", () => {
    expect(decideRetry(1, 120_000, noJitter, middle)).toEqual({
      retry: false,
      reason: "hint-over-cap",
    });
  });

  it("para ao esgotar as tentativas", () => {
    expect(decideRetry(3, null, noJitter, middle)).toEqual({
      retry: false,
      reason: "exhausted",
    });
  });
});
