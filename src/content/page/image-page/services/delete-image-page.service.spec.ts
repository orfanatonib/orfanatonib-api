import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { DeleteImagePageService } from "./delete-image-page.service";

describe("DeleteImagePageService", () => {
  const PROTECTED = "feed-page";
  let tx: { removePage: jest.Mock };
  let transactions: { run: jest.Mock };
  let repo: { findByIdWithSections: jest.Mock };
  let route: { removeRoute: jest.Mock };
  let media: {
    findManyMediaItemsByTargets: jest.Mock;
    removeMediaItemsKeepingFiles: jest.Mock;
  };
  let storage: { deleteAfterCommit: jest.Mock };
  let config: { get: jest.Mock };
  let service: DeleteImagePageService;
  let logError: jest.SpyInstance;

  beforeEach(() => {
    logError = jest.spyOn(Logger.prototype, "error").mockImplementation();
    tx = { removePage: jest.fn() };
    transactions = {
      run: jest.fn(async (work: (t: typeof tx) => Promise<unknown>) =>
        work(tx),
      ),
    };
    repo = { findByIdWithSections: jest.fn() };
    route = { removeRoute: jest.fn() };
    media = {
      findManyMediaItemsByTargets: jest.fn().mockResolvedValue([{ id: "m" }]),
      removeMediaItemsKeepingFiles: jest
        .fn()
        .mockResolvedValue(["https://b/1.png"]),
    };
    storage = { deleteAfterCommit: jest.fn() };
    config = { get: jest.fn().mockReturnValue(PROTECTED) };
    service = new DeleteImagePageService(
      transactions as never,
      repo as never,
      route as never,
      media as never,
      storage as never,
      config as never,
    );
  });
  afterEach(() => jest.restoreAllMocks());

  it("lê o id protegido pelo ConfigService", async () => {
    await expect(service.removePage(PROTECTED)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(config.get).toHaveBeenCalledWith("FEED_ORFANATO_PAGE_ID");
  });

  it("a página protegida do feed nunca é excluída (403) e nem abre transação", async () => {
    await expect(service.removePage(PROTECTED)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(transactions.run).not.toHaveBeenCalled();
  });

  it("sem id protegido configurado, nada é bloqueado", async () => {
    config.get.mockReturnValue(undefined);
    repo.findByIdWithSections.mockResolvedValue({ id: "p1", sections: [] });
    await expect(service.removePage("p1")).resolves.toBeUndefined();
  });

  it("exclui rota e página; só depois remove linhas de mídia e objetos", async () => {
    repo.findByIdWithSections.mockResolvedValue({
      id: "p1",
      sections: [{ id: "s1" }],
      route: { id: "r1" },
    });
    await service.removePage("p1");
    expect(route.removeRoute).toHaveBeenCalledWith("r1");
    expect(tx.removePage).toHaveBeenCalled();
    expect(media.removeMediaItemsKeepingFiles).toHaveBeenCalledWith([
      { id: "m" },
    ]);
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith(["https://b/1.png"]);
    expect(tx.removePage.mock.invocationCallOrder[0]).toBeLessThan(
      media.removeMediaItemsKeepingFiles.mock.invocationCallOrder[0],
    );
  });

  it("página sem seções nem rota: não consulta mídia nem remove rota", async () => {
    repo.findByIdWithSections.mockResolvedValue({ id: "p1", sections: [] });
    media.removeMediaItemsKeepingFiles.mockResolvedValue([]);
    await service.removePage("p1");
    expect(media.findManyMediaItemsByTargets).not.toHaveBeenCalled();
    expect(route.removeRoute).not.toHaveBeenCalled();
  });

  it("página inexistente: 404 padronizado e nada de mídia é tocado", async () => {
    repo.findByIdWithSections.mockResolvedValue(null);
    await expect(service.removePage("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(media.removeMediaItemsKeepingFiles).not.toHaveBeenCalled();
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("[image-page.delete.image-pages-id#rollback-de-transacao] falha na transação: mídia e objetos permanecem (sem referência quebrada)", async () => {
    repo.findByIdWithSections.mockResolvedValue({
      id: "p1",
      sections: [{ id: "s1" }],
    });
    tx.removePage.mockRejectedValue(new Error("db"));
    await expect(service.removePage("p1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(media.removeMediaItemsKeepingFiles).not.toHaveBeenCalled();
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("[image-page.delete.image-pages-id#falha-do-colaborador-sem-efeito-parcial] falha ao remover a rota: 400 e mídia/objetos intactos", async () => {
    repo.findByIdWithSections.mockResolvedValue({
      id: "p1",
      sections: [{ id: "s1" }],
      route: { id: "r1" },
    });
    route.removeRoute.mockRejectedValue(new Error("rota"));
    await expect(service.removePage("p1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.removePage).not.toHaveBeenCalled();
    expect(media.removeMediaItemsKeepingFiles).not.toHaveBeenCalled();
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("falha ao limpar mídia depois do commit não desfaz a exclusão e é registrada", async () => {
    repo.findByIdWithSections.mockResolvedValue({
      id: "p1",
      sections: [{ id: "s1" }],
    });
    media.removeMediaItemsKeepingFiles.mockRejectedValue(new Error("db"));
    await expect(service.removePage("p1")).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalled();
  });

  it("segunda exclusão da mesma página: 404, sem efeito", async () => {
    repo.findByIdWithSections
      .mockResolvedValueOnce({ id: "p1", sections: [] })
      .mockResolvedValueOnce(null);
    await service.removePage("p1");
    await expect(service.removePage("p1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
