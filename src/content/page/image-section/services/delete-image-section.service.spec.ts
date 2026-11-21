/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { DeleteImageSectionService } from "./delete-image-section.service";

function setup(section: object | null = { id: "s1" }) {
  const events: string[] = [];
  const media = [
    { id: "m1", isLocalFile: true, url: "https://b/1" },
    { id: "m2", isLocalFile: false, url: "https://youtu.be/x" },
  ];
  const tx = {
    lockSection: jest.fn(async () => section),
    removeMedia: jest.fn(async (m: { id: string }) => {
      events.push(`row:${m.id}`);
    }),
    removeSection: jest.fn(async () => {
      events.push("section");
    }),
  };
  const transactions = {
    run: jest.fn(async (work: (t: typeof tx) => Promise<unknown>) => {
      const out = await work(tx);
      events.push("commit");
      return out;
    }),
  };
  const processor = { findMediaItemsByTarget: jest.fn(async () => media) };
  const mediaStorage = {
    deleteAfterCommit: jest.fn(async (urls: string[]) => {
      events.push(`s3:${urls.join(",")}`);
    }),
  };
  const service = new DeleteImageSectionService(
    transactions as never,
    processor as never,
    mediaStorage as never,
  );
  return { service, tx, transactions, mediaStorage, events };
}

beforeEach(() => jest.spyOn(Logger.prototype, "error").mockImplementation());
afterEach(() => jest.restoreAllMocks());

describe("DeleteImageSectionService", () => {
  it("encontrado: apaga linhas e publicação na transação e SÓ DEPOIS os objetos locais", async () => {
    const { service, events } = setup();
    await service.deleteSection("s1");
    expect(events).toEqual([
      "row:m1",
      "row:m2",
      "section",
      "commit",
      "s3:https://b/1",
    ]);
  });

  it("[image-section.delete.image-sections-id#nao-encontrado] não encontrado: 404, nada gravado nem apagado do bucket", async () => {
    const { service, tx, mediaStorage } = setup(null);
    await expect(service.deleteSection("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.removeSection).not.toHaveBeenCalled();
    expect(mediaStorage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("[image-section.delete.image-sections-id#rollback-de-transacao] falha ao apagar a publicação: 400 e o bucket não é tocado (sem referência quebrada)", async () => {
    const { service, tx, mediaStorage } = setup();
    tx.removeSection.mockRejectedValueOnce(new Error("db"));
    await expect(service.deleteSection("s1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mediaStorage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("[image-section.delete.image-sections-id#falha-do-colaborador-sem-efeito-parcial] falha ao apagar uma linha de mídia: 400, publicação preservada e bucket intacto", async () => {
    const { service, tx, mediaStorage } = setup();
    tx.removeMedia.mockRejectedValueOnce(new Error("db"));
    await expect(service.deleteSection("s1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.removeSection).not.toHaveBeenCalled();
    expect(mediaStorage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("[image-section.delete.image-sections-id#feliz] apagar remove tudo e entrega as URLs locais ao bucket", async () => {
    const { service, mediaStorage } = setup();
    await service.deleteSection("s1");
    expect(mediaStorage.deleteAfterCommit).toHaveBeenCalledWith([
      "https://b/1",
    ]);
  });

  it("idempotência: repetir após a exclusão devolve 404", async () => {
    const { service, tx } = setup();
    await service.deleteSection("s1");
    tx.lockSection.mockResolvedValueOnce(null as never);
    await expect(service.deleteSection("s1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
