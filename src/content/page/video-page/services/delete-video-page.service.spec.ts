import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";

import { DeleteVideosPageService } from "./delete-video-page.service";
import {
  makeProcessor,
  makeRepo,
  makeStorage,
} from "./video-page-services.testing";

beforeEach(() => {
  jest.spyOn(Logger.prototype, "error").mockImplementation();
});
afterEach(() => jest.restoreAllMocks());

const media = [
  { id: "m1", url: "https://b/a.mp4", isLocalFile: true },
  { id: "m2", url: "https://y.be/1", isLocalFile: false },
];

function setup(page: unknown, repoOverrides: Record<string, unknown> = {}) {
  const storage = makeStorage();
  const repo = makeRepo({
    findById: jest.fn().mockResolvedValue(page),
    ...repoOverrides,
  });
  const svc = new DeleteVideosPageService(
    repo as never,
    makeProcessor(media) as never,
    storage as never,
  );
  return { svc, repo, storage };
}

describe("DeleteVideosPageService", () => {
  it("feliz: remove linhas e página na transação e só então apaga os arquivos locais", async () => {
    const { svc, repo, storage } = setup({ id: "p1", route: { id: "r1" } });
    await svc.execute("p1");
    expect(repo.removeMedia).toHaveBeenCalledWith(expect.anything(), media);
    expect(repo.removePageWithRoute).toHaveBeenCalledTimes(1);
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith(["https://b/a.mp4"]);
  });

  it("não encontrado: 404 sem tocar em banco nem bucket", async () => {
    const { svc, repo, storage } = setup(null);
    await expect(svc.execute("x")).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.runInTransaction).not.toHaveBeenCalled();
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("[video-page.delete.video-pages-id#rollback-de-transacao] falha no banco: erro genérico e nenhum objeto apagado do bucket", async () => {
    const { svc, storage } = setup(
      { id: "p1", route: { id: "r1" } },
      { removePageWithRoute: jest.fn().mockRejectedValue(new Error("fk")) },
    );
    await expect(svc.execute("p1")).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("[video-page.delete.video-pages-id#falha-do-colaborador-sem-efeito-parcial] falha ao remover as linhas de mídia: página e bucket intactos", async () => {
    const { svc, repo, storage } = setup(
      { id: "p1", route: { id: "r1" } },
      { removeMedia: jest.fn().mockRejectedValue(new Error("fk")) },
    );
    await expect(svc.execute("p1")).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.removePageWithRoute).not.toHaveBeenCalled();
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("log sem stack", async () => {
    const { svc } = setup(
      { id: "p1", route: { id: "r1" } },
      { removeMedia: jest.fn().mockRejectedValue(new Error("fk")) },
    );
    const spy = jest.spyOn(Logger.prototype, "error");
    await expect(svc.execute("p1")).rejects.toBeInstanceOf(BadRequestException);
    expect(spy.mock.calls[0]).toHaveLength(1);
  });

  it("[video-page.s3.11] falha ao apagar o objeto no bucket não derruba a exclusão: vai para a fila de limpeza", async () => {
    const s3 = {
      getBucketName: () => "b",
      deleteKey: jest.fn().mockRejectedValue(new Error("denied")),
    };
    const queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const realStorage = new MediaStorageService(s3 as never, queue as never);
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue({ id: "p1", route: { id: "r1" } }),
    });
    const processor = makeProcessor([
      {
        id: "m1",
        url: "http://x/b/local/VideosPage/p1/a.mp4",
        isLocalFile: true,
      },
    ]);
    const svc = new DeleteVideosPageService(
      repo as never,
      processor as never,
      realStorage,
    );
    await expect(svc.execute("p1")).resolves.toBeUndefined();
    expect(repo.removePageWithRoute).toHaveBeenCalledTimes(1);
    expect(queue.enqueue).toHaveBeenCalledWith(
      "local/VideosPage/p1/a.mp4",
      "denied",
    );
  });
});
