import { AiGenerationCapability } from "../ai/enums/ai-generation-capability.enum";
import { RequestStageGenerationDto } from "../dto/request-stage-generation.dto";
import { ContentGenerationJobStatus } from "../enums/content-generation-job-status.enum";
import { RequestStageGenerationService } from "./request-stage-generation.service";

const dto: RequestStageGenerationDto = {
  idempotencyKey: "key-123",
  capability: AiGenerationCapability.TEXT_STRUCTURED,
};

function setup(status: ContentGenerationJobStatus) {
  const packages = {
    requestStageGeneration: jest
      .fn()
      .mockResolvedValue({ id: "job-1", status }),
  };
  const queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
  return {
    packages,
    queue,
    service: new RequestStageGenerationService(
      packages as never,
      queue as never,
    ),
  };
}

describe("RequestStageGenerationService", () => {
  it("cria o job e só então enfileira o id (nada além do id vai para a fila)", async () => {
    const { service, packages, queue } = setup(
      ContentGenerationJobStatus.PENDING,
    );
    const order: string[] = [];
    packages.requestStageGeneration.mockImplementation(() => {
      order.push("tx");
      return Promise.resolve({
        id: "job-1",
        status: ContentGenerationJobStatus.PENDING,
      });
    });
    queue.enqueue.mockImplementation(() => {
      order.push("enqueue");
      return Promise.resolve();
    });

    await service.execute("pkg-1", "stage-1", dto, "user-1");

    expect(order).toEqual(["tx", "enqueue"]);
    expect(queue.enqueue).toHaveBeenCalledWith({ jobId: "job-1" });
    expect(packages.requestStageGeneration).toHaveBeenCalledWith({
      packageId: "pkg-1",
      stageId: "stage-1",
      capability: dto.capability,
      idempotencyKey: "key-123",
      requestedById: "user-1",
      revisionInstructions: null,
      visualConfig: null,
    });
  });

  it.each([
    ContentGenerationJobStatus.RUNNING,
    ContentGenerationJobStatus.SUCCEEDED,
    ContentGenerationJobStatus.FAILED,
  ])(
    "repetir a chave devolve o job %s existente sem enfileirar de novo",
    async (status) => {
      const { service, queue } = setup(status);
      const job = await service.execute("pkg-1", "stage-1", dto, "user-1");
      expect(job.status).toBe(status);
      expect(queue.enqueue).not.toHaveBeenCalled();
    },
  );

  it("falha da transação (conflito) não enfileira nada", async () => {
    const { service, packages, queue } = setup(
      ContentGenerationJobStatus.PENDING,
    );
    packages.requestStageGeneration.mockRejectedValue(
      new Error("Já existe geração ativa"),
    );
    await expect(service.execute("p", "s", dto, "u")).rejects.toThrow(
      "Já existe geração ativa",
    );
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
