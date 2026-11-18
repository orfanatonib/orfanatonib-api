import { AiGenerationCapability } from "../ai/enums/ai-generation-capability.enum";
import { FakeAiGenerationGateway } from "../ai/fake-ai-generation.gateway";
import { ProcessGenerationJobService } from "./process-generation-job.service";

const started = (
  attempts = 1,
  capability = AiGenerationCapability.TEXT_STRUCTURED,
) => ({
  jobId: "job-1",
  packageId: "pkg-1",
  stageId: "stage-1",
  stageType: "SCRIPT",
  capability,
  requestedById: "user-1",
  attempts,
});

function setup(gatewayDirective?: string, attempts = 1, quota?: number) {
  const gateway = new FakeAiGenerationGateway("fake", "local", quota);
  if (gatewayDirective) {
    const original = gateway.generateStructuredText.bind(gateway);
    gateway.generateStructuredText = (r) =>
      original({ ...r, instructions: [...r.instructions, gatewayDirective] });
  }
  const packages = {
    startGenerationJob: jest.fn().mockResolvedValue(started(attempts)),
    saveStageContent: jest.fn().mockResolvedValue({}),
    failGenerationJob: jest.fn().mockResolvedValue(undefined),
  };
  return {
    packages,
    gateway,
    service: new ProcessGenerationJobService(packages as never, gateway),
  };
}

describe("ProcessGenerationJobService (provedor simulado)", () => {
  it("sucesso: grava versão + job concluído na mesma chamada, com snapshot sem segredo", async () => {
    const { service, packages } = setup();
    expect(await service.handle({ jobId: "job-1" })).toEqual({
      status: "done",
    });
    const input = packages.saveStageContent.mock.calls[0][0];
    expect(input.completedJobId).toBe("job-1");
    expect(input.createdById).toBe("user-1");
    expect(input.contentChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(input.generationSnapshot).toMatchObject({
      provider: "FAKE",
      model: "fake-model-1",
      attempts: 1,
    });
    expect(JSON.stringify(input.generationSnapshot)).not.toMatch(
      /key|secret|token":/i,
    );
    expect(packages.failGenerationJob).not.toHaveBeenCalled();
  });

  it("job já concluído/cancelado: ack sem chamar o provedor nem gravar", async () => {
    const { service, packages, gateway } = setup();
    packages.startGenerationJob.mockResolvedValue(null);
    const spy = jest.spyOn(gateway, "generateStructuredText");
    expect(await service.handle({ jobId: "job-1" })).toEqual({
      status: "done",
    });
    expect(spy).not.toHaveBeenCalled();
    expect(packages.saveStageContent).not.toHaveBeenCalled();
  });

  it("429: reagenda (RETRY_SCHEDULED) enquanto há tentativas", async () => {
    const { service, packages } = setup("[[fake:429]]", 1);
    expect(await service.handle({ jobId: "job-1" })).toEqual({
      status: "retry",
      reason: "RATE_LIMIT",
    });
    expect(packages.failGenerationJob).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: "job-1",
        retry: true,
        errorCode: "RATE_LIMIT",
      }),
    );
    expect(packages.saveStageContent).not.toHaveBeenCalled();
  });

  it("429 na última tentativa: falha definitiva (etapa FAILED)", async () => {
    const { service, packages } = setup("[[fake:429]]", 3);
    expect(await service.handle({ jobId: "job-1" })).toEqual({
      status: "failed",
      reason: "RATE_LIMIT",
    });
    expect(packages.failGenerationJob).toHaveBeenCalledWith(
      expect.objectContaining({ retry: false }),
    );
  });

  it.each([
    ["[[fake:quota]]", "QUOTA"],
    ["[[fake:moderation]]", "SAFETY"],
    ["[[fake:schema]]", "SCHEMA"],
  ])(
    "%s é definitiva já na 1ª tentativa (%s), sem retry",
    async (directive, kind) => {
      const { service, packages } = setup(directive, 1);
      expect(await service.handle({ jobId: "job-1" })).toEqual({
        status: "failed",
        reason: kind,
      });
      expect(packages.failGenerationJob).toHaveBeenCalledWith(
        expect.objectContaining({ retry: false, errorCode: kind }),
      );
    },
  );

  it("cota simulada esgotada vira QUOTA definitiva", async () => {
    const { service } = setup(undefined, 1, 1);
    expect(await service.handle({ jobId: "job-1" })).toEqual({
      status: "failed",
      reason: "QUOTA",
    });
  });

  it("capacidade de imagem ainda não é suportada pelo worker: falha definitiva", async () => {
    const { service, packages } = setup();
    packages.startGenerationJob.mockResolvedValue(
      started(1, AiGenerationCapability.IMAGE_GENERATION),
    );
    expect(await service.handle({ jobId: "job-1" })).toEqual({
      status: "failed",
      reason: "SCHEMA",
    });
  });

  it("conflito ao gravar (job cancelado no meio) vira falha sem vazar mensagem do provedor", async () => {
    const { service, packages } = setup();
    packages.saveStageContent.mockRejectedValue(
      new Error("A geração foi cancelada antes de concluir"),
    );
    const out = await service.handle({ jobId: "job-1" });
    expect(out.status).toBe("retry");
    expect(packages.failGenerationJob).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: "Falha do provedor: UNKNOWN" }),
    );
  });
});
