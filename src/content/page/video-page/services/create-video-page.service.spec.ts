import { BadRequestException, Logger } from "@nestjs/common";

import { CreateVideosPageService } from "./create-video-page.service";

beforeEach(() => {
  jest.spyOn(Logger.prototype, "error").mockImplementation();
});
afterEach(() => jest.restoreAllMocks());

function setup(failAt: "save" | "processor" | null = null) {
  let n = 0;
  const runner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn((_e: unknown, v: object) => ({ ...v })),
      save: jest.fn(async (x: { id?: string }) => {
        if (failAt === "save" && x.id) throw new Error("banco");
        return { ...x, id: x.id ?? `p${++n}` };
      }),
    },
  };
  const routes = {
    generateAvailablePath: jest.fn().mockResolvedValue("galeria_videos_x"),
    createRouteWithManager: jest.fn().mockResolvedValue({ id: "r1" }),
  };
  const s3 = {
    upload: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const processor = {
    processMediaItemsPolymorphic:
      failAt === "processor"
        ? jest.fn().mockRejectedValue(new Error("upload"))
        : jest
            .fn()
            .mockResolvedValue([
              { id: "v1", url: "https://b/v.mp4", isLocalFile: true },
            ]),
    deleteMediaItems: jest.fn(
      async (
        items: Array<{ url: string }>,
        del: (u: string) => Promise<void>,
      ) => {
        for (const it of items) await del(it.url);
      },
    ),
  };
  const svc = new CreateVideosPageService(
    { createQueryRunner: () => runner } as never,
    routes as never,
    s3 as never,
    processor as never,
    {} as never,
  );
  return { svc, runner, s3, processor };
}

const dto = {
  title: "Vídeos",
  description: "d",
  public: false,
  videos: [{ uploadType: "link", platformType: "youtube" }],
} as never;

describe("CreateVideosPageService", () => {
  it("feliz: cria a página, processa as mídias e confirma", async () => {
    const { svc, runner, processor } = setup();
    await svc.execute(dto, {});
    expect(processor.processMediaItemsPolymorphic).toHaveBeenCalledTimes(1);
    expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(runner.release).toHaveBeenCalledTimes(1);
  });

  it("falha DEPOIS de gravar as mídias (salvar a página): rollback e a mídia (linha + objeto) é removida", async () => {
    const { svc, runner, processor, s3 } = setup("save");
    await expect(svc.execute(dto, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.commitTransaction).not.toHaveBeenCalled();
    expect(processor.deleteMediaItems).toHaveBeenCalledTimes(1);
    expect(s3.delete).toHaveBeenCalledWith("https://b/v.mp4");
  });

  it("falha no próprio processamento da mídia: nada gravado para limpar", async () => {
    const { svc, processor } = setup("processor");
    await expect(svc.execute(dto, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(processor.deleteMediaItems).not.toHaveBeenCalled();
  });

  it("se a limpeza falhar, o erro devolvido continua o mesmo", async () => {
    const { svc, processor } = setup("save");
    processor.deleteMediaItems.mockRejectedValue(new Error("s3 fora"));
    await expect(svc.execute(dto, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
