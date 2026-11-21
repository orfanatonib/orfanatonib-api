/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { NotFoundException } from "@nestjs/common";
import { GetImageSectionService } from "./get-image-section.service";

const section = (id: string, extra: object = {}) => ({
  id,
  caption: `c-${id}`,
  description: "d",
  public: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  author: { name: "Maria Souza Lima" },
  ...extra,
});
const media = (id: string, targetId: string) => ({
  id,
  targetId,
  url: `https://b/${id}`,
  mediaType: "image",
});

function setup() {
  const repo = {
    findByAuthor: jest.fn(async () => [section("s1"), section("s2")]),
    findAllOrfaSections: jest.fn(async () => [section("s1"), section("s2")]),
    findOne: jest.fn(async () => section("s1") as object | null),
    find: jest.fn(async () => [section("s1")]),
    findPublishedById: jest.fn(
      async () =>
        ({ ...section("s1"), public: true, page: { public: true } }) as
          | object
          | null,
    ),
    countPending: jest.fn(async () => 3),
  };
  const processor = {
    findManyMediaItemsByTargets: jest.fn(async () => [
      media("m1", "s1"),
      media("m2", "s2"),
      media("m3", "s1"),
    ]),
    findMediaItemsByTarget: jest.fn(async () => [media("m1", "s1")]),
  };
  const service = new GetImageSectionService(repo as never, processor as never);
  return { service, repo, processor };
}

describe("GetImageSectionService", () => {
  it("findAll: agrupa as mídias por publicação e repassa o filtro de autor", async () => {
    const { service, repo } = setup();
    const result = await service.findAll("u1");
    expect(repo.findAllOrfaSections).toHaveBeenCalledWith("u1");
    expect(result.map((r) => r.mediaItems.length)).toEqual([2, 1]);
  });

  it("findAll: fila vazia devolve lista vazia", async () => {
    const { service, repo } = setup();
    repo.findAllOrfaSections.mockResolvedValueOnce([]);
    expect(await service.findAll()).toEqual([]);
  });

  it("findOne: encontrado devolve o DTO com a mídia", async () => {
    const { service } = setup();
    const result = await service.findOne("s1");
    expect(result.id).toBe("s1");
    expect(result.mediaItems).toHaveLength(1);
  });

  it("findOne: não encontrado → 404", async () => {
    const { service, repo } = setup();
    repo.findOne.mockResolvedValueOnce(null);
    await expect(service.findOne("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("findMine: só do autor, com a mídia de cada uma", async () => {
    const { service, repo } = setup();
    const result = await service.findMine("u1");
    expect(repo.findByAuthor).toHaveBeenCalledWith("u1");
    expect(result).toHaveLength(2);
  });

  it("pendingCount: devolve a contagem do repository", async () => {
    const { service } = setup();
    expect(await service.pendingCount()).toEqual({ pending: 3 });
  });

  it("assertFeedSectionVisible: visitante vê só seção e galeria públicas; sem permissão = 404", async () => {
    const { service, repo } = setup();
    await expect(
      service.assertFeedSectionVisible("s1", false),
    ).resolves.toBeUndefined();
    repo.findPublishedById.mockResolvedValueOnce({
      ...section("s1"),
      public: false,
      page: { public: true },
    });
    await expect(
      service.assertFeedSectionVisible("s1", false),
    ).rejects.toBeInstanceOf(NotFoundException);
    repo.findPublishedById.mockResolvedValueOnce({
      ...section("s1"),
      public: false,
      page: { public: false },
    });
    await expect(
      service.assertFeedSectionVisible("s1", true),
    ).resolves.toBeUndefined();
    repo.findPublishedById.mockResolvedValueOnce(null);
    await expect(
      service.assertFeedSectionVisible("s1", true),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("findFeedContexts: lote sem N+1; lista vazia não consulta; ids inexistentes ficam fora", async () => {
    const { service, repo, processor } = setup();
    expect((await service.findFeedContexts([])).size).toBe(0);
    expect(repo.find).not.toHaveBeenCalled();
    const map = await service.findFeedContexts(["s1", "gone"]);
    expect([...map.keys()]).toEqual(["s1"]);
    expect(processor.findManyMediaItemsByTargets).toHaveBeenCalledTimes(1);
  });
});
