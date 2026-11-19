import IORedis from "ioredis";

import { BullMqAiJobQueue } from "./bullmq-ai-job-queue";
import type { AiJobOutcome } from "./ai-job-queue.port";

/**
 * Integração com Redis REAL (o do ambiente de desenvolvimento), num prefixo único por execução.
 * Sem Redis acessível, os testes são pulados (não falham).
 */
const REDIS_URL = process.env.REDIS_URL?.trim() || "redis://localhost:6379";
let redisUp = false;

beforeAll(async () => {
  const probe = new IORedis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,
  });
  probe.on("error", () => undefined);
  try {
    await probe.connect();
    await probe.ping();
    redisUp = true;
  } catch {
    redisUp = false;
  } finally {
    probe.disconnect();
  }
});

const wait = async (condition: () => boolean, ms = 8000) => {
  const start = Date.now();
  while (!condition() && Date.now() - start < ms)
    await new Promise((resolve) => setTimeout(resolve, 25));
  return condition();
};

const make = (prefix: string, random = () => 0.5) =>
  new BullMqAiJobQueue({
    redisUrl: REDIS_URL,
    prefix,
    queueName: "t",
    policy: {
      maxAttempts: 3,
      baseDelayMs: 50,
      maxDelayMs: 500,
      jitterRatio: 0,
    },
    random,
  });

const run = (name: string, fn: () => Promise<void>) =>
  it(
    name,
    async () => {
      if (!redisUp) return;
      await fn();
    },
    20_000,
  );

describe("BullMqAiJobQueue (Redis real)", () => {
  run("processa o job e entrega só o id", async () => {
    const queue = make(`test:${Date.now()}:a`);
    const seen: Array<[string, number]> = [];
    queue.start(async (job, attempt) => {
      seen.push([job.jobId, attempt]);
      return { status: "done" };
    }, 2);
    await queue.enqueue({ jobId: "job-1" });
    expect(await wait(() => seen.length === 1)).toBe(true);
    expect(seen[0]).toEqual(["job-1", 1]);
    await queue.close();
  });

  run(
    "falha transitória reagenda com a tentativa seguinte e depois conclui",
    async () => {
      const queue = make(`test:${Date.now()}:b`);
      const attempts: number[] = [];
      queue.start(async (_job, attempt): Promise<AiJobOutcome> => {
        attempts.push(attempt);
        return attempt < 3
          ? { status: "retry", reason: "429" }
          : { status: "done" };
      }, 1);
      await queue.enqueue({ jobId: "job-2" });
      expect(await wait(() => attempts.length === 3)).toBe(true);
      expect(attempts).toEqual([1, 2, 3]);
      await queue.close();
    },
  );

  run("falha definitiva e tentativas esgotadas não reagendam", async () => {
    const queue = make(`test:${Date.now()}:c`);
    const calls: string[] = [];
    queue.start(async (job): Promise<AiJobOutcome> => {
      calls.push(job.jobId);
      return job.jobId === "hard"
        ? { status: "failed", reason: "safety" }
        : { status: "retry", reason: "429" };
    }, 2);
    await queue.enqueue({ jobId: "hard" });
    await queue.enqueue({ jobId: "soft" });
    expect(
      await wait(() => calls.filter((id) => id === "soft").length === 3),
    ).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(calls.filter((id) => id === "hard")).toHaveLength(1);
    expect(calls.filter((id) => id === "soft")).toHaveLength(3);
    await queue.close();
  });

  run(
    "o mesmo id enfileirado duas vezes enquanto espera roda uma vez só (reconciliador é inofensivo)",
    async () => {
      const queue = make(`test:${Date.now()}:d`);
      const calls: string[] = [];
      await queue.enqueue({ jobId: "dup" });
      await queue.enqueue({ jobId: "dup" });
      queue.start(async (job) => {
        calls.push(job.jobId);
        return { status: "done" };
      }, 1);
      expect(await wait(() => calls.length >= 1)).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(calls).toHaveLength(1);
      await queue.close();
    },
  );

  run("health: bullmq saudável com contagens", async () => {
    const queue = make(`test:${Date.now()}:e`);
    const health = await queue.health();
    expect(health).toMatchObject({ driver: "bullmq", healthy: true });
    await queue.close();
  });
});
