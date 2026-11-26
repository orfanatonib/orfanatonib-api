import { GetDocumentService } from "./get-document.service";

const doc = (id: string) =>
  ({
    id,
    name: `Doc ${id}`,
    description: "d",
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as never;

function setup() {
  const repo = { findFiltered: jest.fn(), findOneById: jest.fn() };
  const media = {
    findManyMediaItemsByTargets: jest.fn().mockResolvedValue([]),
    findMediaItemsByTarget: jest.fn(),
  };
  return {
    repo,
    media,
    service: new GetDocumentService(repo as never, media as never),
  };
}

describe("GetDocumentService.findAll (filtros no servidor)", () => {
  it("sem page devolve o array legado e repassa a query ao repositório", async () => {
    const { repo, service } = setup();
    repo.findFiltered.mockResolvedValue({ items: [doc("a")], total: 1 });
    const query = { uploadType: "link" } as never;
    const result = await service.findAll(query);
    expect(Array.isArray(result)).toBe(true);
    expect(repo.findFiltered).toHaveBeenCalledWith(query);
  });

  it("com page devolve data/meta com total filtrado e orderBy padrão createdAt", async () => {
    const { repo, service } = setup();
    repo.findFiltered.mockResolvedValue({ items: [doc("a")], total: 13 });
    const result = await service.findAll({ page: 2, limit: 12 } as never);
    if (Array.isArray(result)) throw new Error("esperava envelope paginado");
    expect(result.meta).toMatchObject({
      page: 2,
      limit: 12,
      totalItems: 13,
      totalPages: 2,
      orderBy: "createdAt",
    });
  });

  it("página fora do alcance devolve data vazia", async () => {
    const { repo, service } = setup();
    repo.findFiltered.mockResolvedValue({ items: [], total: 2 });
    const result = await service.findAll({ page: 5, sortBy: "name" } as never);
    if (Array.isArray(result)) throw new Error("esperava envelope paginado");
    expect(result.data).toEqual([]);
    expect(result.meta).toMatchObject({ totalItems: 2, orderBy: "name" });
  });
});
