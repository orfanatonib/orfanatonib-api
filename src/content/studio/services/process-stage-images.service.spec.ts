import { AiProviderErrorKind } from "../ai/enums/ai-provider-error-kind.enum";
import { fakeStageContent } from "../ai/generation/fake-stage-content";
import { LessonVisualFormat } from "../ai/generation/visual-art.constants";
import { AiProviderRequestError } from "../ai/openai-generation.gateway";
import { ContentAudience } from "../enums/content-audience.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";
import {
  ContentVisualOrientation,
  ContentVisualStyle,
} from "../enums/content-visual.enums";
import { ProcessStageImagesService } from "./process-stage-images.service";

const config = {
  quantity: 4,
  format: LessonVisualFormat.CUTOUT_KIT,
  style: ContentVisualStyle.CUTE_CARTOON,
  orientation: ContentVisualOrientation.LANDSCAPE,
};

// PNG 1x1 válido.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function setup(opts: { failSlots?: string[]; failAll?: boolean } = {}) {
  const content = {
    ...fakeStageContent(
      ContentStageType.LESSON_VISUALS,
      ContentAudience.CHILD,
      "T",
      config,
    ),
    visualConfig: config,
  };
  const generations = {
    loadStageImageContext: jest.fn().mockResolvedValue({
      packageId: "pkg-1",
      stageId: "stage-1",
      stageType: ContentStageType.LESSON_VISUALS,
      audience: ContentAudience.CHILD,
      versionId: "ver-1",
      content,
    }),
    updateJobProgress: jest.fn().mockResolvedValue(undefined),
    markJobSucceeded: jest.fn().mockResolvedValue(undefined),
  };
  const assets = {
    replaceSlot: jest.fn().mockResolvedValue([]),
  };
  const gateway = {
    generateImage: jest.fn().mockImplementation((request) => {
      const slot = String(request.input.item);
      if (opts.failAll || opts.failSlots?.includes(slot))
        return Promise.reject(
          new AiProviderRequestError(AiProviderErrorKind.SAFETY, "refusal"),
        );
      return Promise.resolve({
        provider: "FAKE",
        model: "m",
        mediaType: "image/png",
        bytes: PNG,
        durationMs: 1,
      });
    }),
  };
  const s3 = {
    getEnvironment: jest.fn().mockReturnValue("local"),
    putObject: jest.fn().mockResolvedValue("url"),
    deleteKey: jest.fn().mockResolvedValue(undefined),
  };
  const configService = { get: jest.fn().mockReturnValue(undefined) };
  return {
    generations,
    assets,
    gateway,
    s3,
    service: new ProcessStageImagesService(
      generations as never,
      assets as never,
      gateway as never,
      s3 as never,
      configService as never,
    ),
  };
}

const job = (request: Record<string, unknown> = { versionId: "ver-1" }) =>
  ({
    jobId: "job-1",
    packageId: "pkg-1",
    stageId: "stage-1",
    request,
  }) as never;

describe("ProcessStageImagesService", () => {
  it("gera uma imagem por prancha, guarda no bucket e registra o item (slot)", async () => {
    const { service, gateway, s3, assets, generations } = setup();
    const progress = await service.process(job());
    expect(progress).toMatchObject({ done: 4, total: 4, failed: [] });
    expect(gateway.generateImage).toHaveBeenCalledTimes(4);
    expect(s3.putObject).toHaveBeenCalledTimes(4);
    const keys = s3.putObject.mock.calls.map((call) => call[0] as string);
    expect(keys[0]).toMatch(
      /^local\/content-studio\/pkg-1\/stage-1\/ver-1\/visual-0\d-[0-9a-f]{8}\.png$/,
    );
    expect(assets.replaceSlot.mock.calls.map((c) => c[0].slot).sort()).toEqual([
      "visual-01",
      "visual-02",
      "visual-03",
      "visual-04",
    ]);
    expect(generations.markJobSucceeded).toHaveBeenCalledWith(
      "job-1",
      expect.objectContaining({ done: 4 }),
    );
  });

  it("o tamanho pedido segue a orientação e o prompt carrega as regras da categoria", async () => {
    const { service, gateway } = setup();
    await service.process(job());
    const request = gateway.generateImage.mock.calls[0][0];
    expect(request.size).toBe("1536x1024");
    expect(request.instructions.join("\n")).toContain(
      "crianças de 3 a 11 anos",
    );
  });

  it("o andamento é atualizado a cada imagem (e renova o lease)", async () => {
    const { service, generations } = setup();
    await service.process(job());
    const dones = generations.updateJobProgress.mock.calls.map(
      (call) => call[1].done,
    );
    expect(dones[0]).toBe(0);
    expect(dones[dones.length - 1]).toBe(4);
    expect(generations.updateJobProgress.mock.calls[0][2]).toBeGreaterThan(0);
  });

  it("uma imagem que falha não derruba as outras: fica pendente e o job conclui como parcial", async () => {
    const { service, generations, s3 } = setup({ failSlots: ["visual-03"] });
    const progress = await service.process(job());
    expect(progress).toMatchObject({
      done: 3,
      total: 4,
      failed: ["visual-03"],
    });
    expect(s3.putObject).toHaveBeenCalledTimes(3);
    expect(generations.markJobSucceeded).toHaveBeenCalled();
  });

  it("nenhuma imagem gerada: o job falha com o motivo do provedor", async () => {
    const { service, generations } = setup({ failAll: true });
    await expect(service.process(job())).rejects.toMatchObject({
      kind: AiProviderErrorKind.SAFETY,
    });
    expect(generations.markJobSucceeded).not.toHaveBeenCalled();
  });

  it("refazer: só os itens pedidos, e a imagem antiga sai do bucket depois da nova registrada", async () => {
    const { service, gateway, assets, s3 } = setup();
    assets.replaceSlot.mockResolvedValue(["local/antiga.png"]);
    const progress = await service.process(
      job({
        versionId: "ver-1",
        slots: ["visual-02"],
        instructions: "mais colorido",
      }),
    );
    expect(progress.total).toBe(1);
    expect(gateway.generateImage).toHaveBeenCalledTimes(1);
    expect(
      gateway.generateImage.mock.calls[0][0].instructions.join("\n"),
    ).toContain("mais colorido");
    expect(s3.deleteKey).toHaveBeenCalledWith("local/antiga.png");
  });

  it("job sem versão ou sem escolhas dos visuais é recusado", async () => {
    const { service, generations } = setup();
    await expect(service.process(job({}))).rejects.toMatchObject({
      kind: AiProviderErrorKind.SCHEMA,
    });
    generations.loadStageImageContext.mockResolvedValue(null);
    await expect(service.process(job())).rejects.toMatchObject({
      kind: AiProviderErrorKind.SCHEMA,
    });
  });
});

describe("ProcessStageImagesService: peças da fixação com imagem de referência", () => {
  const fixationSetup = (stored: string[] = []) => {
    const base = setup();
    base.generations.loadStageImageContext.mockResolvedValue({
      packageId: "pkg-1",
      stageId: "stage-1",
      stageType: ContentStageType.VERSE_FIXATION,
      audience: ContentAudience.CHILD,
      versionId: "ver-1",
      content: fakeStageContent(
        ContentStageType.VERSE_FIXATION,
        ContentAudience.CHILD,
        "T",
      ),
    });
    const saved = new Set(stored);
    const assets = base.assets as unknown as Record<string, jest.Mock>;
    assets.replaceSlot = jest.fn().mockImplementation((input) => {
      saved.add(String(input.slot));
      return Promise.resolve([]);
    });
    assets.findGeneratedSlot = jest
      .fn()
      .mockImplementation((_version: string, slot: string) =>
        Promise.resolve(saved.has(slot) ? { storageKey: `k/${slot}` } : null),
      );
    const s3 = base.s3 as unknown as Record<string, jest.Mock>;
    s3.buildUrl = jest.fn().mockImplementation((key: string) => `u/${key}`);
    s3.downloadOwned = jest.fn().mockResolvedValue(PNG);
    const calls = () =>
      base.gateway.generateImage.mock.calls.map(([request]) => ({
        slot: String(request.input.item),
        referenced: Boolean(request.referenceImages?.length),
        ruled: (request.instructions as string[]).some((line) =>
          line.startsWith("IMAGEM DE REFERÊNCIA ANEXADA"),
        ),
      }));
    return { ...base, s3, calls };
  };
  const run = (
    service: ProcessStageImagesService,
    slots: string[] | null = null,
  ) =>
    service.process({
      jobId: "job-1",
      stageId: "stage-1",
      request: { versionId: "ver-1", slots },
    } as never);

  it("gera a primeira peça sem referência e as demais copiando a primeira", async () => {
    const { service, calls, s3 } = fixationSetup();
    await run(service);
    const made = calls();
    const of = (slot: string) => made.find((call) => call.slot === slot);
    expect(of("compilado-01")).toMatchObject({ referenced: false });
    expect(of("peca-01")).toMatchObject({ referenced: false, ruled: false });
    const followers = made.filter(
      (call) => !["compilado-01", "peca-01"].includes(call.slot),
    );
    expect(followers.length).toBeGreaterThanOrEqual(2);
    expect(followers.every((call) => call.referenced && call.ruled)).toBe(true);
    // A primeira peça fica pronta antes de qualquer peça que a copia.
    expect(made.findIndex((call) => call.slot === "peca-01")).toBeLessThan(
      made.findIndex((call) => call.slot === followers[0].slot),
    );
    expect(s3.downloadOwned).toHaveBeenCalledWith(
      "u/k/peca-01",
      expect.any(Number),
    );
  });

  it("refazer uma peça usa a primeira já guardada; refazer a primeira usa a segunda", async () => {
    const one = fixationSetup(["peca-01", "peca-02"]);
    await run(one.service, ["peca-02"]);
    expect(one.calls()).toEqual([
      { slot: "peca-02", referenced: true, ruled: true },
    ]);
    expect(one.s3.downloadOwned).toHaveBeenCalledWith(
      "u/k/peca-01",
      expect.any(Number),
    );

    const first = fixationSetup(["peca-01", "peca-02"]);
    await run(first.service, ["peca-01"]);
    expect(first.calls()).toEqual([
      { slot: "peca-01", referenced: true, ruled: true },
    ]);
    expect(first.s3.downloadOwned).toHaveBeenCalledWith(
      "u/k/peca-02",
      expect.any(Number),
    );
  });

  it("sem a peça-modelo guardada (ou com falha ao ler), gera só pelo prompt", async () => {
    const missing = fixationSetup();
    await run(missing.service, ["peca-02"]);
    expect(missing.calls()).toEqual([
      { slot: "peca-02", referenced: false, ruled: false },
    ]);

    const broken = fixationSetup(["peca-01"]);
    broken.s3.downloadOwned.mockRejectedValue(new Error("x"));
    await run(broken.service, ["peca-02"]);
    expect(broken.calls()).toEqual([
      { slot: "peca-02", referenced: false, ruled: false },
    ]);
  });
});
