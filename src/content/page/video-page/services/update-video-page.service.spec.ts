import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";

import { UpdateVideosPageService } from "./update-video-page.service";
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

const localOld = {
  id: "m1",
  url: "https://b/old.mp4",
  storageKey: "k/old.mp4",
  isLocalFile: true,
  originalName: "old.mp4",
  size: 5,
};
const linkOld = { id: "m2", url: "https://y.be/1", isLocalFile: false };
const file = { originalname: "n.mp4", size: 9 } as Express.Multer.File;

function setup(
  existingMedia: unknown[] = [localOld, linkOld],
  repoOverrides: Record<string, unknown> = {},
  page: unknown = {
    id: "p1",
    name: "a",
    description: "b",
    public: false,
    route,
  },
) {
  const storage = makeStorage();
  const processor = makeProcessor(existingMedia);
  const repo = makeRepo(
    { findById: jest.fn().mockResolvedValue(page), ...repoOverrides },
    existingMedia,
  );
  const routes = { upsertRoute: jest.fn().mockResolvedValue(route) };
  const svc = new UpdateVideosPageService(
    routes as never,
    storage as never,
    makeMediaService(storage, processor),
    repo as never,
  );
  return { svc, repo, storage, routes };
}

const dto = (videos: unknown[]) =>
  ({ id: "p1", title: "T", description: "D", public: true, videos }) as never;
const keepLocal = { id: "m1", uploadType: "upload" };
const keepLink = { id: "m2", uploadType: "link", url: "https://y.be/1" };

describe("UpdateVideosPageService", () => {
  it("atualização completa: campos da página e rota, mídias mantidas sem tocar no bucket", async () => {
    const { svc, repo, storage, routes } = setup();
    const res = await svc.execute("p1", dto([keepLocal, keepLink]), {});
    expect(res.title).toBe("T");
    expect(res.public).toBe(true);
    expect(routes.upsertRoute).toHaveBeenCalledWith(
      "r1",
      expect.objectContaining({ title: "T", public: true }),
    );
    expect(repo.removeMedia).toHaveBeenCalledWith(expect.anything(), []);
    expect(res.videos[0]).toMatchObject({ url: localOld.url });
    expect(res.videos[0]).not.toHaveProperty("storageKey");
    expect(res.videos[0]).not.toHaveProperty("targetId");
    expect(storage.uploadAll).not.toHaveBeenCalled();
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([]);
  });

  it("não encontrado: 404 sem transação", async () => {
    const { svc, repo } = setup([], {}, null);
    await expect(svc.execute("x", dto([]), {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.runInTransaction).not.toHaveBeenCalled();
  });

  it("mídia com id que não pertence à página: 404 e nada fica no bucket", async () => {
    const { svc, storage } = setup();
    await expect(
      svc.execute(
        "p1",
        dto([{ id: "alheio", uploadType: "link", url: "u" }]),
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.batch.discard).toHaveBeenCalled();
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("substituir arquivo: novo sobe, antigo só sai do bucket depois do commit", async () => {
    const { svc, storage } = setup();
    const res = await svc.execute(
      "p1",
      dto([{ ...keepLocal, fieldKey: "f0" }, keepLink]),
      { f0: file },
    );
    expect(res.videos[0].url).toBe("https://b/new-1.mp4");
    expect(storage.batch.commit).toHaveBeenCalled();
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([localOld.url]);
  });

  it("remover mídia: linha removida e objeto apagado depois do commit", async () => {
    const { svc, repo, storage } = setup();
    await svc.execute("p1", dto([keepLink]), {});
    expect(repo.removeMedia).toHaveBeenCalledWith(expect.anything(), [
      localOld,
    ]);
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([localOld.url]);
  });

  it("trocar arquivo por link: o objeto antigo vira obsoleto", async () => {
    const { svc, storage } = setup();
    await svc.execute(
      "p1",
      dto([{ id: "m1", uploadType: "link", url: "https://y.be/9" }, keepLink]),
      {},
    );
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([localOld.url]);
  });

  it("[video-page.patch.video-pages-id#rollback-de-transacao] falha depois do upload: rollback, novos descartados e antigos NÃO apagados", async () => {
    const { svc, storage } = setup([localOld, linkOld], {
      savePage: jest.fn().mockRejectedValue(new Error("banco")),
    });
    await expect(
      svc.execute("p1", dto([{ ...keepLocal, fieldKey: "f0" }, keepLink]), {
        f0: file,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.batch.discard).toHaveBeenCalledTimes(1);
    expect(storage.batch.commit).not.toHaveBeenCalled();
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("[video-page.patch.video-pages-id#falha-do-colaborador-sem-efeito-parcial] conflito no 2º item (link sem URL): 400 com a causa, antigos intactos", async () => {
    const { svc, storage } = setup();
    await expect(
      svc.execute(
        "p1",
        dto([
          { ...keepLocal, fieldKey: "f0" },
          { id: "m2", uploadType: "link" },
        ]),
        { f0: file },
      ),
    ).rejects.toThrow(/URL is required/);
    expect(storage.batch.discard).toHaveBeenCalled();
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("página apagada entre a leitura e a transação: 404 e nada gravado", async () => {
    const { svc, repo, storage } = setup([], {
      lockPage: jest.fn().mockResolvedValue(false),
    });
    await expect(svc.execute("p1", dto([]), {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.savePage).not.toHaveBeenCalled();
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("a edição trava a página antes de ler a mídia (edições simultâneas se enfileiram)", async () => {
    const { svc, repo } = setup();
    await svc.execute("p1", dto([keepLocal, keepLink]), {});
    const lock = repo.lockPage.mock.invocationCallOrder[0];
    const read = repo.findMedia.mock.invocationCallOrder[0];
    expect(lock).toBeLessThan(read);
  });

  it("upload novo sem arquivo é recusado", async () => {
    const { svc } = setup();
    await expect(
      svc.execute("p1", dto([{ uploadType: "upload", fieldKey: "f9" }]), {}),
    ).rejects.toThrow(/File missing/);
  });

  it("tipo inválido é recusado", async () => {
    const { svc } = setup();
    await expect(
      svc.execute("p1", dto([{ uploadType: "x" }]), {}),
    ).rejects.toThrow(/Invalid media type/);
  });

  it("falha ao gravar: log sem stack (só a causa)", async () => {
    const { svc } = setup([], {
      savePage: jest.fn().mockRejectedValue(new Error("banco")),
    });
    const spy = jest.spyOn(Logger.prototype, "error");
    await expect(svc.execute("p1", dto([]), {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(spy.mock.calls[0]).toHaveLength(1);
    expect(String(spy.mock.calls[0][0])).toContain("banco");
  });
});
