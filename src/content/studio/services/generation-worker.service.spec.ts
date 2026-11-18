import { InMemoryAiJobQueue } from "../queue/in-memory-ai-job-queue";
import { GenerationWorkerService } from "./generation-worker.service";

const flush = () => new Promise((r) => setImmediate(r));

function setup(env: Record<string, string> = {}) {
  const queue = new InMemoryAiJobQueue();
  const processor = { handle: jest.fn().mockResolvedValue({ status: "done" }) };
  const packages = {
    findRecoverableGenerationJobs: jest
      .fn()
      .mockResolvedValue([{ id: "a" }, { id: "b" }]),
  };
  const config = { get: (k: string) => env[k] };
  const worker = new GenerationWorkerService(
    queue,
    processor as never,
    packages as never,
    config as never,
  );
  return { queue, processor, packages, worker };
}

describe("GenerationWorkerService", () => {
  it("no boot, reenfileira os jobs recuperáveis e processa pela fila", async () => {
    const { worker, processor, queue } = setup();
    worker.onModuleInit();
    await flush();
    await flush();
    expect(processor.handle).toHaveBeenCalledTimes(2);
    await worker.onModuleDestroy();
    expect(queue.completed.sort()).toEqual(["a", "b"]);
  });

  it("CS_QUEUE_DISABLED=true não registra consumidor nem reconcilia", async () => {
    const { worker, processor, packages } = setup({
      CS_QUEUE_DISABLED: "true",
    });
    worker.onModuleInit();
    await flush();
    expect(packages.findRecoverableGenerationJobs).not.toHaveBeenCalled();
    expect(processor.handle).not.toHaveBeenCalled();
    await worker.onModuleDestroy();
  });

  it("falha na reconciliação não derruba o worker", async () => {
    const { worker, packages } = setup();
    packages.findRecoverableGenerationJobs.mockRejectedValue(new Error("db"));
    expect(await worker.reconcile()).toBe(0);
  });
});
