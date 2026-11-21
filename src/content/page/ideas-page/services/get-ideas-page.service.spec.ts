/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { NotFoundException } from "@nestjs/common";
import { GetIdeasPageService } from "./get-ideas-page.service";

const section = (id: string) => ({
  id,
  title: id,
  description: "d",
  public: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});
const page = (id: string, isPublic: boolean) =>
  ({
    id,
    title: id,
    subtitle: "s",
    description: "d",
    public: isPublic,
    route: { id: "r", path: "/p", public: true },
    sections: [section(`${id}-s1`)],
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as never;

function setup(options: { pages?: unknown[]; fail?: boolean } = {}) {
  const pages = {
    findAllPagesWithSections: jest.fn(async () => {
      if (options.fail) throw new Error("db");
      return options.pages ?? [page("a", true)];
    }),
    findOnePageById: jest.fn(async (id: string) =>
      id === "missing" ? null : page(id, true),
    ),
  };
  const media = {
    findManyMediaItemsByTargets: jest.fn(async (ids: string[]) =>
      ids.map((targetId) => ({
        id: `m-${targetId}`,
        targetId,
        title: "m",
        description: "d",
        mediaType: "image",
        uploadType: "link",
        url: "https://x",
        isLocalFile: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    ),
  };
  const service = new GetIdeasPageService(pages as never, media as never);
  return { service, pages, media };
}

describe("GetIdeasPageService", () => {
  it("findOne: inexistente ⇒ 404", async () => {
    const { service } = setup();
    await expect(service.findPageWithMedia("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("findPageWithMedia agrupa as mídias pela seção", async () => {
    const { service, media } = setup();
    const res = await service.findPageWithMedia("a");
    expect(media.findManyMediaItemsByTargets).toHaveBeenCalledWith(
      ["a-s1"],
      expect.anything(),
    );
    expect(res.sections[0].medias).toHaveLength(1);
  });

  it("findAll: mantém a ordem do repository e trata `public` legado como privado (não filtra, não expõe)", async () => {
    const { service } = setup({
      pages: [page("b", false), page("a", true), page("c", true)],
    });
    const res = await service.findAllPagesWithMedia();
    expect(res.map((p) => p.id)).toEqual(["b", "a", "c"]);
    expect(res.every((p) => !("public" in p))).toBe(true);
    expect(res.every((p) => p.route.public === false)).toBe(true);
  });

  it("lista vazia não consulta mídia relevante e devolve []", async () => {
    const { service } = setup({ pages: [] });
    expect(await service.findAllPagesWithMedia()).toEqual([]);
  });

  it("falha do repository é propagada", async () => {
    const { service } = setup({ fail: true });
    await expect(service.findAllPagesWithMedia()).rejects.toThrow("db");
  });
});
