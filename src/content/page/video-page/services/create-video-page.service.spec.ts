import { BadRequestException, Logger } from "@nestjs/common";

import { CreateVideosPageService } from "./create-video-page.service";
import {
  makeMediaService,
  makeProcessor,
  makeRepo,
  makeStorage,
  route,
} from "./video-page-services.testing";

beforeEach(() => {
  jest.spyOn(Logger.prototype, "error").mockImplementation();
});
afterEach(() => jest.restoreAllMocks());

function setup(repoOverrides: Record<string, unknown> = {}) {
  const storage = makeStorage();
  const processor = makeProcessor();
  const repo = makeRepo(repoOverrides);
  const routes = {
    generateAvailablePath: jest.fn().mockResolvedValue("galeria_videos_x"),
    createRouteWithManager: jest.fn().mockResolvedValue(route),
  };
  const svc = new CreateVideosPageService(
    routes as never,
    storage as never,
    makeMediaService(storage, processor),
    repo as never,
  );
  return { svc, repo, storage, routes };
}

const link = {
  uploadType: "link",
  url: " https://y.be/1 ",
  platformType: "youtube",
};
const upload = (field: string) => ({ uploadType: "upload", fieldKey: field });
const file = { originalname: "a.mp4", size: 10 } as Express.Multer.File;
const dto = (videos: unknown[]) =>
  ({ title: "Vídeos", description: "d", public: false, videos }) as never;

describe("CreateVideosPageService", () => {
  it("feliz: página, rota e mídia na mesma transação; nada vai ao bucket para link", async () => {
    const { svc, repo, storage } = setup();
    const res = await svc.execute(dto([link]), {});
    expect(repo.runInTransaction).toHaveBeenCalledTimes(1);
    expect(repo.saveMedia).toHaveBeenCalledTimes(1);
    expect(res.videos).toHaveLength(1);
    expect(res.videos[0].url).toBe("https://y.be/1");
    expect(storage.uploadAll).not.toHaveBeenCalled();
    expect(storage.batch.commit).toHaveBeenCalledTimes(1);
    expect(storage.batch.discard).not.toHaveBeenCalled();
  });

  it("upload: sobe o arquivo, guarda a chave e confirma o lote", async () => {
    const { svc, storage } = setup();
    const res = await svc.execute(dto([upload("f0")]), { f0: file });
    expect(storage.uploadAll).toHaveBeenCalledTimes(1);
    expect(res.videos[0]).toMatchObject({
      isLocalFile: true,
      originalName: "a.mp4",
    });
    // DTO de saída próprio: a chave do bucket e o vínculo interno não vazam.
    expect(res.videos[0]).not.toHaveProperty("storageKey");
    expect(res.videos[0]).not.toHaveProperty("targetId");
    expect(res.videos[0]).not.toHaveProperty("targetType");
    expect(storage.batch.commit).toHaveBeenCalled();
  });

  it("[video-page.post.video-pages#rollback-de-transacao] falha ao gravar a página depois do upload: erro genérico e objetos descartados", async () => {
    const { svc, storage } = setup({
      savePage: jest.fn().mockRejectedValue(new Error("banco")),
    });
    await expect(
      svc.execute(dto([upload("f0")]), { f0: file }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.batch.discard).toHaveBeenCalledTimes(1);
    expect(storage.batch.commit).not.toHaveBeenCalled();
  });

  it("arquivo ausente: 400 com a causa e nada gravado", async () => {
    const { svc, repo, storage } = setup();
    await expect(svc.execute(dto([upload("f0")]), {})).rejects.toThrow(
      /File missing/,
    );
    expect(repo.saveMedia).not.toHaveBeenCalled();
    expect(storage.batch.discard).toHaveBeenCalled();
  });

  it("link sem URL é recusado", async () => {
    const { svc } = setup();
    await expect(
      svc.execute(dto([{ uploadType: "link", url: " " }]), {}),
    ).rejects.toThrow(/URL is required/);
  });

  it("tipo de envio inválido é recusado", async () => {
    const { svc } = setup();
    await expect(svc.execute(dto([{ uploadType: "x" }]), {})).rejects.toThrow(
      /Invalid media type/,
    );
  });

  it("[video-page.post.video-pages#falha-do-colaborador-sem-efeito-parcial] recusa do arquivo pelo armazenamento (MIME/limite) propaga a causa, descarta e não confirma o lote", async () => {
    const { svc, storage, repo } = setup();
    storage.uploadAll.mockRejectedValueOnce(
      new BadRequestException("recusado"),
    );
    await expect(
      svc.execute(dto([upload("f0")]), { f0: file }),
    ).rejects.toThrow("recusado");
    expect(storage.batch.discard).toHaveBeenCalled();
    expect(storage.batch.commit).not.toHaveBeenCalled();
    expect(repo.saveMedia).not.toHaveBeenCalled();
  });

  it("o log do erro não carrega stack", async () => {
    const { svc } = setup({
      savePage: jest.fn().mockRejectedValue(new Error("banco")),
    });
    const spy = jest.spyOn(Logger.prototype, "error");
    await expect(svc.execute(dto([link]), {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    const args = spy.mock.calls[0];
    expect(args).toHaveLength(1);
    expect(String(args[0])).toContain("banco");
    expect(String(args[0])).not.toMatch(/\n\s+at /);
  });
});
