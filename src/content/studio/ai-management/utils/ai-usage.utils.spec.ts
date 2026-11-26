import { aggregateAiUsage } from "./ai-usage.utils";

const since = new Date("2026-01-01T00:00:00Z");

describe("aggregateAiUsage", () => {
  it("soma por provedor/modelo, ordena por tokens e ignora lixo", () => {
    const result = aggregateAiUsage(
      [
        {
          provider: "openai",
          model: "m1",
          usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
          durationMs: 1000,
        },
        {
          provider: "openai",
          model: "m1",
          usage: { inputTokens: 20, outputTokens: 10 },
          durationMs: 3000,
        },
        { provider: "gemini", model: "g1", usage: null, durationMs: 500 },
        {
          provider: "gemini",
          model: "g1",
          usage: { totalTokens: 500 },
          durationMs: "x",
        },
        { model: "sem-provedor" },
        {},
      ],
      30,
      since,
    );
    expect(result.generations).toBe(4);
    expect(result.byModel.map((m) => m.model)).toEqual(["g1", "m1"]);
    expect(result.byModel[1]).toMatchObject({
      generations: 2,
      inputTokens: 30,
      outputTokens: 15,
      totalTokens: 45,
      averageDurationMs: 2000,
    });
    expect(result.byModel[0]).toMatchObject({
      totalTokens: 500,
      generations: 2,
    });
    expect(result.totalTokens).toBe(545);
    expect(result).toMatchObject({ days: 30, since: since.toISOString() });
  });
  it("sem dados devolve zeros", () => {
    expect(aggregateAiUsage([], 7, since)).toMatchObject({
      generations: 0,
      totalTokens: 0,
      byModel: [],
    });
  });
});
