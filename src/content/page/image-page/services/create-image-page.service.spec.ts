/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
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
  const tx = {
    manager: {},
    savePage: jest.fn(async (x: { id?: string }) => ({
      ...x,
      id: x.id ?? `p${++saved}`,
    })),
    saveSection: jest.fn(async (x: object) => ({ ...x, id: `s${++saved}` })),
  };
  const transactions = {
    run: jest.fn(async (work: (t: typeof tx) => Promise<unknown>) => work(tx)),
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
    transactions as never,
    routes as never,
    s3 as never,
    processor as never,
  );
  return { svc, tx, transactions, routes, s3, processor };
}

const page = (sections: object[]) =>
  ({ title: "Galeria", description: "d", public: false, sections }) as never;

describe("CreateImagePageService", () => {
  it("feliz: cria galeria, seções e mídias e confirma", async () => {
    const { svc, tx, transactions, processor } = setup();
    const result = await svc.createImagePage(
      page([section("a"), section("b")]),
      {},
    );
    expect(transactions.run).toHaveBeenCalledTimes(1);
    expect(tx.saveSection).toHaveBeenCalledTimes(2);
    expect(processor.processMediaItemsPolymorphic).toHaveBeenCalledTimes(2);
    expect(result.sections).toHaveLength(2);
  });

  it("[image-page.post.image-pages#falha-do-colaborador-sem-efeito-parcial] falha na mídia da 2ª seção: rollback E a mídia já criada da 1ª seção (linha + objeto) é removida", async () => {
    const { svc, processor, s3 } = setup(2);
    await expect(
      svc.createImagePage(page([section("a"), section("b")]), {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(processor.deleteMediaItems).toHaveBeenCalledTimes(1);
    expect(s3.delete).toHaveBeenCalledWith("https://b/1.png");
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

  it("upload declarado sem arquivo: 400 antes de abrir a transação e de enviar qualquer objeto", async () => {
    const { svc, transactions, processor, s3 } = setup();
    const withUpload = {
      caption: "a",
      description: "d",
      public: true,
      mediaItems: [
        {
          uploadType: "upload",
          isLocalFile: true,
          originalName: "x.png",
          fieldKey: "ausente",
        },
      ],
    };
    await expect(
      svc.createImagePage(page([section("ok"), withUpload]), {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transactions.run).not.toHaveBeenCalled();
    expect(processor.processMediaItemsPolymorphic).not.toHaveBeenCalled();
    expect(s3.upload).not.toHaveBeenCalled();
  });

  it("[image-page.post.image-pages#rollback-de-transacao] falha do banco na transação depois do upload: objetos enviados são descartados", async () => {
    const { svc, transactions, processor, s3 } = setup();
    transactions.run.mockImplementationOnce(async (work) => {
      await work({
        manager: {},
        savePage: jest.fn(async () => ({ id: "p" })),
        saveSection: jest.fn(async () => ({ id: "s1" })),
      } as never);
      throw new Error("FK violada no commit");
    });
    await expect(
      svc.createImagePage(page([section("a")]), {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(processor.deleteMediaItems).toHaveBeenCalledTimes(1);
    expect(s3.delete).toHaveBeenCalledWith("https://b/1.png");
  });
});
