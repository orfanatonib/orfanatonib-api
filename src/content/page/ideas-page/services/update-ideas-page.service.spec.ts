/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  MediaItemEntity,
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { UpdateIdeasPageDto } from "../dto/update-ideas-page.dto";
import type { MediaItemDto } from "src/shared/dto/media-item-dto";
import { IdeasPageMediaSyncService } from "./ideas-page-media-sync.service";
import {
  fakeStorage,
  fakeWriteRepo,
  file,
  mediaProcessor,
} from "./ideas-page-spec-helpers";
import { UpdateIdeasPageService } from "./update-ideas-page.service";

const oldMedia = (id: string, sectionId = "s1", local = true) =>
  ({
    id,
    targetId: sectionId,
    isLocalFile: local,
    url: `https://bucket/old/${id}.png`,
    uploadType: local ? UploadType.UPLOAD : UploadType.LINK,
    mediaType: MediaType.IMAGE,
    title: "t",
    description: "d",
    storageKey: `old/${id}.png`,
  }) as MediaItemEntity;

const dto = (sections: UpdateIdeasPageDto["sections"]): UpdateIdeasPageDto =>
  ({
    id: "p1",
    title: "T",
    subtitle: "S",
    description: "D",
    sections,
  }) as never;

interface Options {
  pageFound?: boolean;
  routeFound?: boolean;
  media?: MediaItemEntity[];
  sections?: Array<{ id: string }>;
  failOnUpload?: number;
  failOnSaveMedia?: boolean;
}

function setup(options: Options = {}) {
  const { storage, removed } = fakeStorage(options);
  const saved: Array<Record<string, unknown>> = [];
  const tx = {
    lockPage: jest.fn(async () =>
      options.pageFound === false ? null : { id: "p1" },
    ),
    findSections: jest.fn(async () => options.sections ?? [{ id: "s1" }]),
    findMediaOfSections: jest.fn(async () => options.media ?? []),
    removeSections: jest.fn(async () => undefined),
    removeMedia: jest.fn(async () => undefined),
    savePage: jest.fn(async (p: unknown) => p),
    saveSection: jest.fn(async (s: { id: string }) => s),
    createSection: jest.fn(async () => ({ id: "new-s" })),
    saveMedia: jest.fn(async (m: Record<string, unknown>) => {
      if (options.failOnSaveMedia) throw new Error("db");
      const row = { id: "saved", ...m };
      saved.push(row);
      return row;
    }),
    loadPage: jest.fn(async () => ({
      id: "p1",
      title: "T",
      subtitle: "S",
      description: "D",
      sections: [],
      route: { id: "r1", path: "/x" },
    })),
  };
  const repo = fakeWriteRepo(tx);
  const route = {
    findRouteByEntityId: jest.fn(async () =>
      options.routeFound === false ? null : { id: "r1" },
    ),
    upsertRoute: jest.fn(async () => ({ id: "r1" })),
  };
  const sync = new IdeasPageMediaSyncService(
    mediaProcessor(),
    storage as never,
  );
  const service = new UpdateIdeasPageService(
    repo as never,
    route as never,
    sync,
    storage as never,
  );
  return { service, tx, route, storage, removed, saved, repo };
}

const section = (
  id: string | undefined,
  medias: Partial<MediaItemDto>[] = [],
) => ({
  id,
  title: "S",
  description: "d",
  medias: medias as MediaItemDto[],
});

describe("UpdateIdeasPageService", () => {
  it("atualização parcial: só título/descrição, seção existente mantida", async () => {
    const { service, tx, storage } = setup();
    const res = await service.updateIdeasPage("p1", dto([section("s1")]), {});
    expect(res.id).toBe("p1");
    expect(tx.savePage).toHaveBeenCalledWith({
      id: "p1",
      public: false,
      title: "T",
      subtitle: "S",
      description: "D",
    });
    expect(tx.saveSection).toHaveBeenCalledTimes(1);
    expect(tx.removeSections).toHaveBeenCalledWith([]);
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([]);
  });

  it("página inexistente ⇒ 404 sem nada gravado", async () => {
    const { service, tx } = setup({ pageFound: false });
    await expect(
      service.updateIdeasPage("x", dto([]), {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.savePage).not.toHaveBeenCalled();
  });

  it("rota ausente ⇒ 404", async () => {
    const { service } = setup({ routeFound: false });
    await expect(
      service.updateIdeasPage("p1", dto([]), {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("seção id desconhecido (de outra página) vira seção nova, nunca sobrescreve", async () => {
    const { service, tx } = setup();
    await service.updateIdeasPage("p1", dto([section("alheia")]), {});
    expect(tx.createSection).toHaveBeenCalledTimes(1);
    expect(tx.saveSection).not.toHaveBeenCalled();
  });

  it("[ideas-page.s3.05] remover item: linha sai e o objeto só é apagado após o commit", async () => {
    const m = oldMedia("m1");
    const { service, tx, storage } = setup({ media: [m] });
    await service.updateIdeasPage("p1", dto([section("s1", [])]), {});
    expect(tx.removeMedia).toHaveBeenCalledWith([m]);
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([m.url]);
  });

  it("[ideas-page.s3.04] substituir arquivo: novo sobe, antigo só some após o commit", async () => {
    const m = oldMedia("m1");
    const { service, storage, saved } = setup({ media: [m] });
    await service.updateIdeasPage(
      "p1",
      dto([
        section("s1", [
          {
            id: "m1",
            title: "t",
            description: "d",
            uploadType: UploadType.UPLOAD,
            mediaType: MediaType.IMAGE,
            isLocalFile: true,
            fieldKey: "novo",
          },
        ]),
      ]),
      { novo: file("novo") },
    );
    expect(saved[0]).toMatchObject({
      id: "m1",
      url: expect.stringContaining("novo") as string,
    });
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([m.url]);
  });

  it("manter arquivo existente não envia nem apaga nada", async () => {
    const m = oldMedia("m1");
    const { service, storage, saved } = setup({ media: [m] });
    await service.updateIdeasPage(
      "p1",
      dto([
        section("s1", [
          {
            id: "m1",
            title: "novo título",
            description: "d",
            uploadType: UploadType.UPLOAD,
            mediaType: MediaType.IMAGE,
            isLocalFile: true,
          },
        ]),
      ]),
      {},
    );
    expect(saved[0]).toMatchObject({ id: "m1", url: m.url });
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([]);
  });

  it("trocar arquivo por link: arquivo antigo apagado após o commit", async () => {
    const m = oldMedia("m1");
    const { service, storage, saved } = setup({ media: [m] });
    await service.updateIdeasPage(
      "p1",
      dto([
        section("s1", [
          {
            id: "m1",
            title: "t",
            description: "d",
            uploadType: UploadType.LINK,
            mediaType: MediaType.VIDEO,
            isLocalFile: false,
            url: "https://youtu.be/x",
          },
        ]),
      ]),
      {},
    );
    expect(saved[0]).toMatchObject({
      isLocalFile: false,
      url: "https://youtu.be/x",
      storageKey: null,
    });
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([m.url]);
  });

  it("[ideas-page.s3.06] falha no 2º item: novos descartados, antigos intactos (nada apagado)", async () => {
    const m = oldMedia("m1");
    const { service, storage, removed } = setup({
      media: [m],
      failOnUpload: 2,
    });
    const item = (key: string) => ({
      title: key,
      description: "d",
      uploadType: UploadType.UPLOAD,
      mediaType: MediaType.IMAGE,
      isLocalFile: true,
      fieldKey: key,
    });
    await expect(
      service.updateIdeasPage(
        "p1",
        dto([section("s1", [item("a"), item("b")])]),
        { a: file("a"), b: file("b") },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(removed).toHaveLength(1);
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("[ideas-page.patch.ideas-pages-id#rollback-de-transacao] rollback: falha do banco depois do upload descarta o novo e não apaga o antigo", async () => {
    const m = oldMedia("m1");
    const { service, storage, removed } = setup({
      media: [m],
      failOnSaveMedia: true,
    });
    await expect(
      service.updateIdeasPage(
        "p1",
        dto([
          section("s1", [
            {
              id: "m1",
              title: "t",
              description: "d",
              uploadType: UploadType.UPLOAD,
              mediaType: MediaType.IMAGE,
              isLocalFile: true,
              fieldKey: "n",
            },
          ]),
        ]),
        { n: file("n") },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(removed).toHaveLength(1);
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("[ideas-page.patch.ideas-pages-id#falha-do-colaborador-sem-efeito-parcial] falha do colaborador (rota) desfaz o upload e não confirma nada", async () => {
    const { service, route, removed, storage } = setup();
    route.upsertRoute.mockRejectedValueOnce(new Error("rota"));
    await expect(
      service.updateIdeasPage(
        "p1",
        dto([
          section("s1", [
            {
              title: "t",
              description: "d",
              uploadType: UploadType.UPLOAD,
              mediaType: MediaType.IMAGE,
              isLocalFile: true,
              fieldKey: "n",
            },
          ]),
        ]),
        { n: file("n") },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(removed).toHaveLength(1);
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("arquivo declarado e ausente em item novo ⇒ 400 (o conteúdo do cliente não passa)", async () => {
    const { service } = setup();
    await expect(
      service.updateIdeasPage(
        "p1",
        dto([
          section("s1", [
            {
              title: "t",
              description: "d",
              uploadType: UploadType.UPLOAD,
              mediaType: MediaType.IMAGE,
              isLocalFile: true,
              fieldKey: "falta",
            },
          ]),
        ]),
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("seção removida leva as mídias dela", async () => {
    const m = oldMedia("m9", "s2");
    const { service, tx } = setup({
      media: [m],
      sections: [{ id: "s1" }, { id: "s2" }],
    });
    await service.updateIdeasPage("p1", dto([section("s1")]), {});
    expect(tx.removeSections).toHaveBeenCalledWith([{ id: "s2" }]);
    expect(tx.removeMedia).toHaveBeenCalledWith([m]);
  });
});
