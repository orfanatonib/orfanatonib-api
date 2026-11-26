import { BadRequestException, ConflictException, Logger } from "@nestjs/common";

import { CreateMeditationService } from "./create-meditation.service";

beforeEach(() => {
  jest.spyOn(Logger.prototype, "error").mockImplementation();
});
afterEach(() => jest.restoreAllMocks());

const dto = (over: object = {}) =>
  ({
    topic: "Fé",
    // 2026-12-07 é segunda; 2026-12-11 é sexta.
    startDate: "2026-12-07",
    endDate: "2026-12-11",
    days: [{ day: "MONDAY", verse: "Jo 1", topic: "t" }],
    media: { title: "m", isLocalFile: true, uploadType: "upload" },
    ...over,
  }) as never;

const file = { originalname: "m.pdf", size: 9 } as Express.Multer.File;

function setup(existing: Array<{ startDate: string; endDate: string }> = []) {
  const repo = {
    findAllWithRelations: jest.fn().mockResolvedValue(existing),
    create: jest.fn((x: object) => x),
    save: jest.fn().mockResolvedValue({ id: "m1", topic: "Fé" }),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const s3 = {
    upload: jest.fn().mockResolvedValue("https://b/m.pdf"),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const routes = {
    createRoute: jest.fn().mockResolvedValue({}),
    removeRouteByEntity: jest.fn().mockResolvedValue(undefined),
  };
  const media = {
    buildBaseMediaItem: jest.fn().mockReturnValue({}),
    saveMediaItem: jest.fn().mockResolvedValue({ id: "mi1" }),
    findMediaItemsByTarget: jest.fn().mockResolvedValue([]),
    deleteMediaItems: jest.fn().mockResolvedValue(undefined),
  };
  return {
    repo,
    s3,
    routes,
    media,
    svc: new CreateMeditationService(
      repo as never,
      s3 as never,
      routes as never,
      media as never,
    ),
  };
}

describe("CreateMeditationService", () => {
  it("feliz: grava, sobe o arquivo, salva a mídia e cria a rota", async () => {
    const { svc, repo, s3, routes, media } = setup();
    await expect(svc.create(dto(), file)).resolves.toMatchObject({ id: "m1" });
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(s3.upload).toHaveBeenCalledWith(file);
    expect(media.saveMediaItem).toHaveBeenCalledTimes(1);
    expect(routes.createRoute).toHaveBeenCalledTimes(1);
    expect(s3.delete).not.toHaveBeenCalled();
  });

  it("início que não é segunda e fim que não é sexta: 400 sem gravar nada", async () => {
    const { svc, repo } = setup();
    await expect(
      svc.create(dto({ startDate: "2026-12-08" }), file),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      svc.create(dto({ endDate: "2026-12-12" }), file),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("semana que sobrepõe outra: 409 sem gravar nada", async () => {
    const { svc, repo } = setup([
      { startDate: "2026-12-07", endDate: "2026-12-11" },
    ]);
    await expect(svc.create(dto(), file)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("upload local sem arquivo: 400 e a meditação já gravada é desfeita", async () => {
    const { svc, repo } = setup();
    await expect(svc.create(dto(), undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repo.delete).toHaveBeenCalledWith("m1");
  });

  it("falha ao criar a rota DEPOIS de subir o arquivo: remove a mídia (e o objeto), a rota e a meditação", async () => {
    const { svc, repo, routes, media, s3 } = setup();
    routes.createRoute.mockRejectedValue(new Error("rota"));
    media.findMediaItemsByTarget.mockResolvedValue([
      { id: "mi1", url: "https://b/m.pdf" },
    ]);
    await expect(svc.create(dto(), file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(media.deleteMediaItems).toHaveBeenCalledTimes(1);
    expect(routes.removeRouteByEntity).toHaveBeenCalledWith(
      expect.anything(),
      "m1",
    );
    expect(repo.delete).toHaveBeenCalledWith("m1");
    expect(s3.delete).not.toHaveBeenCalled();
  });

  it("falha ao salvar a mídia depois do upload (sem linha de mídia): apaga o objeto enviado", async () => {
    const { svc, media, s3, repo } = setup();
    media.saveMediaItem.mockRejectedValue(new Error("banco"));
    await expect(svc.create(dto(), file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(s3.delete).toHaveBeenCalledWith("https://b/m.pdf");
    expect(repo.delete).toHaveBeenCalledWith("m1");
  });

  it("se desfazer também falhar, o erro original é o devolvido", async () => {
    const { svc, media, repo } = setup();
    media.saveMediaItem.mockRejectedValue(new Error("banco"));
    repo.delete.mockRejectedValue(new Error("delete falhou"));
    await expect(svc.create(dto(), file)).rejects.toThrow("banco");
  });
});
