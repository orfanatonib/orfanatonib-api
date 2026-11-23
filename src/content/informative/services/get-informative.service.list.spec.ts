import { GetInformativeService } from "./get-informative.service";

const entity = (id: string) =>
  ({
    id,
    title: `Aviso ${id}`,
    description: "d",
    public: true,
    route: { id: "r1" },
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as never;

describe("GetInformativeService.findAll (filtros no servidor)", () => {
  it("sem page devolve o array legado", async () => {
    const repo = {
      findFiltered: jest
        .fn()
        .mockResolvedValue({ items: [entity("a")], total: 1 }),
    };
    const service = new GetInformativeService(repo as never);
    const query = { public: false } as never;
    const result = await service.findAll(query);
    expect(Array.isArray(result)).toBe(true);
    expect(repo.findFiltered).toHaveBeenCalledWith(query);
  });

  it("com page devolve data/meta com o total filtrado", async () => {
    const repo = {
      findFiltered: jest
        .fn()
        .mockResolvedValue({ items: [entity("a"), entity("b")], total: 25 }),
    };
    const service = new GetInformativeService(repo as never);
    const result = await service.findAll({
      page: 3,
      limit: 10,
      sortBy: "title",
    } as never);
    if (Array.isArray(result)) throw new Error("esperava envelope paginado");
    expect(result.data).toHaveLength(2);
    expect(result.meta).toMatchObject({
      page: 3,
      limit: 10,
      totalItems: 25,
      totalPages: 3,
      orderBy: "title",
    });
  });

  it("página fora do alcance devolve data vazia", async () => {
    const repo = {
      findFiltered: jest.fn().mockResolvedValue({ items: [], total: 4 }),
    };
    const service = new GetInformativeService(repo as never);
    const result = await service.findAll({ page: 8 } as never);
    if (Array.isArray(result)) throw new Error("esperava envelope paginado");
    expect(result.data).toEqual([]);
    expect(result.meta.totalItems).toBe(4);
  });
});
