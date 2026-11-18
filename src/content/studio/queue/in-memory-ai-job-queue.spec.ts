/* eslint-disable @typescript-eslint/require-await -- handlers assíncronos de teste */
import { AiJobOutcome } from "./ai-job-queue.port";
import { InMemoryAiJobQueue } from "./in-memory-ai-job-queue";
import { RetryPolicy } from "./provider-retry.utils";

const policy: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 10_000,
  jitterRatio: 0,
};

describe("InMemoryAiJobQueue", () => {
  let clock: number;
  const now = () => clock;
  beforeEach(() => {
    clock = 0;
  });

  const make = () => new InMemoryAiJobQueue(policy, now, () => 0.5);
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  it("processa o job e registra como concluído", async () => {
    const queue = make();
    queue.start(async () => ({ status: "done" }), 2);
    await queue.enqueue({ jobId: "j1" });
    await queue.close();
    expect(queue.completed).toEqual(["j1"]);
  });

  it("respeita a concorrência global", async () => {
    const queue = make();
    let inFlight = 0;
    let peak = 0;
    queue.start(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await flush();
      inFlight--;
      return { status: "done" };
    }, 2);
    for (const id of ["a", "b", "c", "d", "e"])
      await queue.enqueue({ jobId: id });
    await queue.close();
    expect(peak).toBe(2);
    expect(queue.completed).toHaveLength(5);
  });

  it("falha transitória: reagenda com backoff e só roda quando o relógio passa", async () => {
    const queue = make();
    const outcomes: AiJobOutcome[] = [
      { status: "retry", reason: "429" },
      { status: "done" },
    ];
    const attempts: number[] = [];
    queue.start(async (_job, attempt) => {
      attempts.push(attempt);
      return outcomes.shift() ?? { status: "done" };
    }, 1);
    await queue.enqueue({ jobId: "j" });
    await flush();
    expect(attempts).toEqual([1]);
    expect(queue.pending).toBe(1);

    clock = 999;
    queue.pump();
    await flush();
    expect(attempts).toEqual([1]);

    clock = 1_000;
    queue.pump();
    await flush();
    expect(attempts).toEqual([1, 2]);
    expect(queue.completed).toEqual(["j"]);
  });

  it("Retry-After do provedor manda no atraso", async () => {
    const queue = make();
    queue.start(
      async (_j, attempt) =>
        attempt === 1
          ? { status: "retry", retryAfterMs: 5_000, reason: "429" }
          : { status: "done" },
      1,
    );
    await queue.enqueue({ jobId: "j" });
    await flush();
    clock = 4_999;
    queue.pump();
    await flush();
    expect(queue.completed).toEqual([]);
    clock = 5_000;
    queue.pump();
    await flush();
    expect(queue.completed).toEqual(["j"]);
  });

  it("dica acima do teto vai direto para dead letter (não dorme)", async () => {
    const queue = make();
    queue.start(
      async () => ({ status: "retry", retryAfterMs: 60_000, reason: "quota" }),
      1,
    );
    await queue.enqueue({ jobId: "j" });
    await queue.close();
    expect(queue.deadLetters).toEqual([
      { job: { jobId: "j" }, reason: "quota (hint-over-cap)", attempts: 1 },
    ]);
    expect(queue.pending).toBe(0);
  });

  it("esgota as tentativas e para", async () => {
    const queue = make();
    const seen: number[] = [];
    queue.start(async (_j, attempt) => {
      seen.push(attempt);
      return { status: "retry", reason: "net" };
    }, 1);
    await queue.enqueue({ jobId: "j" });
    for (let i = 0; i < 5; i++) {
      clock += 20_000;
      queue.pump();
      await flush();
    }
    expect(seen).toEqual([1, 2, 3]);
    expect(queue.deadLetters[0]).toMatchObject({
      attempts: 3,
      reason: "net (exhausted)",
    });
  });

  it("falha definitiva e exceção do handler vão para dead letter sem retry", async () => {
    const queue = make();
    queue.start(async (job) => {
      if (job.jobId === "x") throw new Error("boom");
      return { status: "failed", reason: "schema" };
    }, 2);
    await queue.enqueue({ jobId: "f" });
    await queue.enqueue({ jobId: "x" });
    await queue.close();
    expect(queue.deadLetters.map((d) => d.reason).sort()).toEqual([
      "boom",
      "schema",
    ]);
  });

  it("depois de close() não aceita novos jobs", async () => {
    const queue = make();
    queue.start(async () => ({ status: "done" }), 1);
    await queue.close();
    await expect(queue.enqueue({ jobId: "j" })).rejects.toThrow("queue closed");
  });
});
