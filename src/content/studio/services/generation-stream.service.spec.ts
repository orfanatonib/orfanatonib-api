import { ResourceNotFoundException } from "src/common/exceptions";
import { GENERATION_STREAM } from "../constants";
import type { ContentGenerationJobEntity } from "../entities/content-generation-job.entity";
import { ContentGenerationJobStatus } from "../enums/content-generation-job-status.enum";
import type { GenerationStreamRepository } from "../repositories/generation-stream.repository";
import type { SseFrame } from "../utils/generation-stream.utils";
import { GenerationStreamService } from "./generation-stream.service";

const job = (
  over: Partial<ContentGenerationJobEntity>,
): ContentGenerationJobEntity =>
  ({
    id: "j1",
    stageId: "s1",
    idempotencyKey: "k",
    capability: "TEXT_STRUCTURED",
    status: ContentGenerationJobStatus.PENDING,
    attempts: 0,
    availableAt: new Date(0),
    workerId: null,
    leaseExpiresAt: null,
    heartbeatAt: null,
    errorCode: null,
    errorMessage: null,
    requestedById: "u",
    createdAt: new Date(0),
    updatedAt: new Date(1000),
    ...over,
  }) as unknown as ContentGenerationJobEntity;

/** Relógio falso: cada `sleep` avança o tempo e consome o próximo estado do banco. */
function setup(states: ContentGenerationJobEntity[][], exists = true) {
  let now = 0;
  let read = 0;
  const repository = {
    packageExists: jest.fn().mockResolvedValue(exists),
    findJobsOfPackage: jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve(states[Math.min(read++, states.length - 1)]),
      ),
  } as unknown as GenerationStreamRepository;
  const clock = {
    now: () => now,
    sleep: (ms: number) => {
      now += ms;
      return Promise.resolve();
    },
  };
  const service = new GenerationStreamService(repository);
  const collect = async (signal = new AbortController().signal) => {
    const frames: SseFrame[] = [];
    for await (const frame of service.watch("p1", signal, clock))
      frames.push(frame);
    return frames;
  };
  return { collect, repository };
}

describe("GenerationStreamService", () => {
  it("pacote inexistente ⇒ 404 antes de qualquer frame", async () => {
    const { collect } = setup([[]], false);
    await expect(collect()).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it("emite o estado inicial, só emite de novo quando muda e encerra por ociosidade", async () => {
    const running = job({
      status: ContentGenerationJobStatus.RUNNING,
      updatedAt: new Date(2000),
    });
    const done = job({
      status: ContentGenerationJobStatus.SUCCEEDED,
      updatedAt: new Date(3000),
    });
    const { collect } = setup([[job({})], [running], [running], [done]]);
    const frames = await collect();
    const jobsFrames = frames.filter((f) => "event" in f && f.event === "jobs");
    expect(jobsFrames).toHaveLength(3);
    const statuses = jobsFrames.map(
      (f) => (f as { data: Array<{ status: string }> }).data[0].status,
    );
    expect(statuses).toEqual(["PENDING", "RUNNING", "SUCCEEDED"]);
    expect(frames[frames.length - 1]).toEqual({
      event: "end",
      data: { reason: "idle" },
    });
  });

  it("manda heartbeat enquanto há geração ativa sem mudança", async () => {
    const running = job({ status: ContentGenerationJobStatus.RUNNING });
    const { collect } = setup([[running]]);
    const frames = await collect();
    expect(frames.some((f) => "comment" in f)).toBe(true);
    expect(frames[frames.length - 1]).toEqual({
      event: "end",
      data: { reason: "timeout" },
    });
  });

  it("usa só o último job de cada etapa", async () => {
    const newer = job({
      id: "new",
      status: ContentGenerationJobStatus.RUNNING,
    });
    const older = job({ id: "old", status: ContentGenerationJobStatus.FAILED });
    const { collect } = setup([[newer, older]]);
    const [first] = await collect();
    expect(
      (first as { data: Array<{ id: string }> }).data.map((d) => d.id),
    ).toEqual(["new"]);
  });

  it("para quando o cliente desconecta", async () => {
    const controller = new AbortController();
    controller.abort();
    const { collect } = setup([[job({})]]);
    expect(await collect(controller.signal)).toEqual([]);
    expect(GENERATION_STREAM.pollMs).toBeGreaterThan(0);
  });
});
