/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { BadRequestException } from "@nestjs/common";
import {
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { CreateIdeasPageDto } from "../dto/create-ideas-page.dto";
import { CreateIdeasPageService } from "./create-ideas-page.service";
import {
  fakeStorage,
  fakeWriteRepo,
  file,
  mediaProcessor,
} from "./ideas-page-spec-helpers";

const upload = (key: string, title = key) => ({
  title,
  description: "d",
  mediaType: MediaType.IMAGE,
  uploadType: UploadType.UPLOAD,
  isLocalFile: true,
  fieldKey: key,
});

const dtoWith = (...medias: ReturnType<typeof upload>[]): CreateIdeasPageDto =>
  ({
    title: "Ideias",
    subtitle: "s",
    description: "d",
    sections: [{ title: "Sec", description: "d", medias }],
  }) as CreateIdeasPageDto;

function setup(options: { failOnUpload?: number; txFailure?: Error } = {}) {
  const { storage, removed } = fakeStorage(options);
  const saved: unknown[] = [];
  const tx = {
    createPage: jest.fn(async () => ({ id: "p1" })),
    createSection: jest.fn(async () => ({ id: "s1" })),
    saveMedia: jest.fn(async (m: unknown) => {
      if (options.txFailure) throw options.txFailure;
      saved.push(m);
      return m;
    }),
    attachRoute: jest.fn(async () => undefined),
    loadPage: jest.fn(async () => ({
      id: "p1",
      title: "Ideias",
      sections: [],
      route: null,
    })),
  };
  const repo = fakeWriteRepo(tx);
  const route = {
    generateAvailablePath: jest.fn(async () => "galeria_ideias_x"),
    createRouteWithManager: jest.fn(async () => ({ id: "r1" })),
  };
  const service = new CreateIdeasPageService(
    repo as never,
    route as never,
    mediaProcessor(),
    storage as never,
  );
  return { service, tx, route, storage, removed, saved, repo };
}

describe("CreateIdeasPageService", () => {
  it("feliz: grava página, seção, mídia com chave e rota; nada é descartado", async () => {
    const { service, tx, route, removed, saved } = setup();
    const res = await service.createIdeasPage(dtoWith(upload("f1")), {
      f1: file("f1"),
    });
    expect(res.id).toBe("p1");
    expect(tx.createPage).toHaveBeenCalledTimes(1);
    expect(tx.attachRoute).toHaveBeenCalled();
    expect(route.createRouteWithManager).toHaveBeenCalled();
    expect(saved[0]).toMatchObject({
      isLocalFile: true,
      storageKey: expect.stringContaining("k/f1") as string,
      targetId: "s1",
    });
    expect(removed).toEqual([]);
  });

  it("link: grava sem enviar arquivo", async () => {
    const { service, storage, saved } = setup();
    const dto = dtoWith();
    dto.sections[0].medias = [
      {
        title: "yt",
        description: "d",
        mediaType: MediaType.VIDEO,
        uploadType: UploadType.LINK,
        isLocalFile: false,
        url: " https://youtu.be/x ",
      },
    ];
    await service.createIdeasPage(dto, {});
    expect(storage.uploadAll).toHaveBeenCalledWith([], expect.anything());
    expect(saved[0]).toMatchObject({
      url: "https://youtu.be/x",
      isLocalFile: false,
    });
  });

  it("validação: arquivo declarado e ausente ⇒ 400 e nada é gravado nem enviado", async () => {
    const { service, tx, storage } = setup();
    await expect(
      service.createIdeasPage(dtoWith(upload("f1")), {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.uploadAll).not.toHaveBeenCalled();
    expect(tx.createPage).not.toHaveBeenCalled();
  });

  it("[ideas-page.s3.02] falha no 2º arquivo: 1º enviado é descartado e o banco não é tocado", async () => {
    const { service, tx, removed } = setup({ failOnUpload: 2 });
    await expect(
      service.createIdeasPage(dtoWith(upload("f1"), upload("f2")), {
        f1: file("f1"),
        f2: file("f2"),
      }),
    ).rejects.toThrow("arquivo recusado");
    expect(tx.createPage).not.toHaveBeenCalled();
    expect(removed).toEqual(["k/f1-1"]);
  });

  it("[ideas-page.s3.03] [ideas-page.post.ideas-pages#rollback-de-transacao] falha do banco depois do upload: rollback e todos os objetos descartados", async () => {
    const { service, removed } = setup({ txFailure: new Error("dup entry") });
    await expect(
      service.createIdeasPage(dtoWith(upload("f1"), upload("f2")), {
        f1: file("f1"),
        f2: file("f2"),
      }),
    ).rejects.toThrow("dup entry");
    expect(removed).toHaveLength(2);
  });

  it("[ideas-page.post.ideas-pages#falha-do-colaborador-sem-efeito-parcial] falha na criação da rota propaga e descarta os arquivos (sem efeito parcial)", async () => {
    const { service, route, removed } = setup();
    route.createRouteWithManager.mockRejectedValueOnce(new Error("rota"));
    await expect(
      service.createIdeasPage(dtoWith(upload("f1")), { f1: file("f1") }),
    ).rejects.toThrow("rota");
    expect(removed).toHaveLength(1);
  });

  it("falha do repository (transação) é propagada", async () => {
    const { service, repo } = setup();
    repo.transaction.mockRejectedValueOnce(new Error("conexão"));
    await expect(service.createIdeasPage(dtoWith(), {})).rejects.toThrow(
      "conexão",
    );
  });
});
