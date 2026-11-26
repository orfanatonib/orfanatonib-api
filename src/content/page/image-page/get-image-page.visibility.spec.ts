/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { NotFoundException } from "@nestjs/common";
import type { Request } from "express";

import { ImageController } from "./image-page.controller";
import { GetImagePageService } from "./services/get-image-page.service";

const page = (id: string, isPublic: boolean) =>
  ({
    id,
    name: id,
    description: "d",
    public: isPublic,
    route: { id: "r", path: "/p", public: isPublic },
    sections: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as never;

function setup(loggedIn: boolean) {
  const pages = {
    // A visibilidade agora é aplicada pelo repositório (no banco): o dublê a reproduz.
    findListWithSections: jest.fn(
      async (_query: unknown, includeNonPublic: boolean) => {
        const items = includeNonPublic
          ? [page("pub", true), page("priv", false)]
          : [page("pub", true)];
        return { items, total: items.length };
      },
    ),
    findByIdWithSections: jest.fn(async (id: string) =>
      id === "pub" ? page("pub", true) : page("priv", false),
    ),
    findById: jest.fn(async (id: string) =>
      id === "pub" ? page("pub", true) : page("priv", false),
    ),
  };
  const sections = { findAndCount: jest.fn(async () => [[], 0]) };
  const media = { findManyMediaItemsByTargets: jest.fn(async () => []) };
  const auth = {
    isLoggedIn: jest.fn(async () => loggedIn),
    getUserId: jest.fn(async () => (loggedIn ? "viewer" : null)),
  };
  const celebrations = { summarize: jest.fn(async () => new Map()) };
  const comments = { countBySectionIds: jest.fn(async () => new Map()) };
  const service = new GetImagePageService(
    pages as never,
    sections as never,
    media as never,
    auth as never,
    celebrations as never,
    comments as never,
  );
  return { pages, sections, service };
}

const req = {} as Request;

describe("galerias: visibilidade por sessão", () => {
  it("anônimo só recebe galerias públicas; com sessão, todas", async () => {
    const anon = setup(false);
    expect(
      (await anon.service.findAll(await anon.service.canSeeNonPublic(req))).map(
        (p) => p.id,
      ),
    ).toEqual(["pub"]);
    const logged = setup(true);
    expect(
      (
        await logged.service.findAll(await logged.service.canSeeNonPublic(req))
      ).map((p) => p.id),
    ).toEqual(["pub", "priv"]);
  });

  it("findOne: galeria não pública é 404 para anônimo", async () => {
    const { service } = setup(false);
    await expect(service.findOne("priv", false)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect((await service.findOne("pub", false)).id).toBe("pub");
    expect((await service.findOne("priv", true)).id).toBe("priv");
  });

  it("seções paginadas: anônimo em galeria não pública é 404 e nem consulta as seções", async () => {
    const { service, sections } = setup(false);
    await expect(
      service.findSectionsPaginated("priv", 1, 2, req),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(sections.findAndCount).not.toHaveBeenCalled();
  });

  it("seções paginadas: anônimo em galeria pública só vê seções públicas; com sessão, todas", async () => {
    const anon = setup(false);
    await anon.service.findSectionsPaginated("pub", 1, 2, req);
    const anonArg = (
      anon.sections.findAndCount.mock.calls[0] as unknown as [
        { where: Record<string, unknown> },
      ]
    )[0];
    expect(anonArg.where).toMatchObject({ public: true });
    const logged = setup(true);
    await logged.service.findSectionsPaginated("priv", 1, 2, req);
    const arg = (
      logged.sections.findAndCount.mock.calls[0] as unknown as [
        { where: Record<string, unknown> },
      ]
    )[0];
    expect(arg.where).not.toHaveProperty("public");
  });
});

describe("ImageController: paginação de seções sanitizada", () => {
  it.each([
    ["abc", "abc", 1, 2],
    ["0", "0", 1, 2],
    ["-5", "1000", 1, 50],
    ["3", "7", 3, 7],
  ])("page=%s limit=%s -> %i/%i", async (p, l, expectedPage, expectedLimit) => {
    const getService = {
      findSectionsPaginated: jest.fn().mockResolvedValue({}),
    };
    const controller = new ImageController(
      {} as never,
      {} as never,
      getService as never,
      {} as never,
    );
    await controller.getPaginatedSections("id", p, l, req);
    expect(getService.findSectionsPaginated).toHaveBeenCalledWith(
      "id",
      expectedPage,
      expectedLimit,
      req,
    );
  });
});

describe("galerias: listagem com filtros e paginação", () => {
  it("sem page devolve o array legado e repassa visibilidade e filtros ao repositório", async () => {
    const { service, pages } = setup(true);
    const query = { search: "x", public: true };
    const result = await service.findList(true, query);
    expect(Array.isArray(result)).toBe(true);
    expect(pages.findListWithSections).toHaveBeenCalledWith(query, true);
  });

  it("com page devolve { data, meta } com o total vindo do banco", async () => {
    const { service, pages } = setup(true);
    pages.findListWithSections.mockResolvedValueOnce({
      items: [page("pub", true)],
      total: 25,
    } as never);
    const result = await service.findList(true, {
      page: 2,
      limit: 10,
      sortBy: "title" as never,
    });
    expect(result).toMatchObject({
      data: [{ id: "pub" }],
      meta: {
        page: 2,
        limit: 10,
        totalItems: 25,
        totalPages: 3,
        orderBy: "title",
      },
    });
  });

  it("visitante pedindo public=false recebe vazio, sem consultar mídia", async () => {
    const { service, pages } = setup(false);
    pages.findListWithSections.mockResolvedValueOnce({
      items: [],
      total: 0,
    } as never);
    const result = await service.findList(false, { public: false, page: 1 });
    expect(pages.findListWithSections).toHaveBeenCalledWith(
      { public: false, page: 1 },
      false,
    );
    expect(result).toMatchObject({
      data: [],
      meta: { totalItems: 0, totalPages: 1 },
    });
  });
});
