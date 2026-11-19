import { BadRequestException, Logger } from "@nestjs/common";

import { CreateImagePageService } from "./create-image-page.service";

beforeEach(() => {
  jest.spyOn(Logger.prototype, "error").mockImplementation();
});
afterEach(() => jest.restoreAllMocks());

const section = (caption: string) => ({
  caption,
  description: "d",
  public: true,
  mediaItems: [],
});

function setup(processorFailsOnCall: number | null = null) {
  let saved = 0;
  const runner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn((_e: unknown, v: object) => ({ ...v })),
      save: jest.fn(async (x: { id?: string }) => ({
        ...x,
        id: x.id ?? `id${++saved}`,
      })),
    },
  };
  const routes = {
    generateAvailablePath: jest.fn().mockResolvedValue("galeria_x"),
    createRouteWithManager: jest.fn().mockResolvedValue({ id: "r1" }),
  };
  const s3 = {
    upload: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  let call = 0;
  const processor = {
    processMediaItemsPolymorphic: jest.fn(async () => {
      call += 1;
      if (processorFailsOnCall === call) throw new Error("upload");
      return [
        { id: `media${call}`, url: `https://b/${call}.png`, isLocalFile: true },
      ];
    }),
    deleteMediaItems: jest.fn(
      async (
        items: Array<{ url: string }>,
        del: (u: string) => Promise<void>,
      ) => {
        for (const it of items) await del(it.url);
      },
    ),
  };
  const svc = new CreateImagePageService(
    { createQueryRunner: () => runner } as never,
    routes as never,
    s3 as never,
    processor as never,
  );
  return { svc, runner, s3, processor };
}

const page = (sections: object[]) =>
  ({ title: "Galeria", description: "d", public: false, sections }) as never;

describe("CreateImagePageService", () => {
  it("feliz: cria galeria, seções e mídias e confirma", async () => {
    const { svc, runner, processor } = setup();
    await svc.createImagePage(page([section("a"), section("b")]), {});
    expect(processor.processMediaItemsPolymorphic).toHaveBeenCalledTimes(2);
    expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(runner.release).toHaveBeenCalledTimes(1);
  });

  it("falha na mídia da 2ª seção: rollback E a mídia já criada da 1ª seção (linha + objeto) é removida", async () => {
    const { svc, runner, processor, s3 } = setup(2);
    await expect(
      svc.createImagePage(page([section("a"), section("b")]), {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.commitTransaction).not.toHaveBeenCalled();
    expect(processor.deleteMediaItems).toHaveBeenCalledTimes(1);
    expect(s3.delete).toHaveBeenCalledWith("https://b/1.png");
    expect(runner.release).toHaveBeenCalledTimes(1);
  });

  it("falha na 1ª seção: nada a limpar", async () => {
    const { svc, processor } = setup(1);
    await expect(
      svc.createImagePage(page([section("a")]), {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(processor.deleteMediaItems).not.toHaveBeenCalled();
  });

  it("se a limpeza também falhar, o erro devolvido continua o mesmo (400 genérico)", async () => {
    const { svc, processor } = setup(2);
    processor.deleteMediaItems.mockRejectedValue(new Error("s3 fora"));
    await expect(
      svc.createImagePage(page([section("a"), section("b")]), {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
