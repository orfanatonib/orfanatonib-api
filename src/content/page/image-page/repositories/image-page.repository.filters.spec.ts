import { callsOf, fakeQb } from "../../page-list-query.testing";
import { ImagePageRepository } from "./image-page.repository";

function setup(ids: string[], total = ids.length) {
  const qb = fakeQb(
    ids.map((id) => ({ id })),
    total,
  );
  const repo = new ImagePageRepository({
    createEntityManager: () => ({}),
  } as never);
  const find = jest.fn((options: { where: { id: { value: string[] } } }) =>
    Promise.resolve(
      [...options.where.id.value].reverse().map((id) => ({ id, sections: [] })),
    ),
  );
  jest.spyOn(repo, "createQueryBuilder").mockReturnValue(qb as never);
  jest.spyOn(repo, "find").mockImplementation(find as never);
  return { repo, qb, find };
}

describe("ImagePageRepository.findListWithSections", () => {
  it("paginado: pagina os ids no banco, conta com os filtros e só então carrega as seções", async () => {
    const { repo, qb, find } = setup(["b", "a"], 7);
    const result = await repo.findListWithSections(
      {
        search: "x",
        public: true,
        page: 2,
        limit: 2,
        sortBy: "title" as never,
      },
      true,
    );
    expect(callsOf(qb, "select")).toEqual([["page.id"]]);
    expect(callsOf(qb, "orderBy")).toEqual([["page.name", "DESC"]]);
    expect(callsOf(qb, "offset")).toEqual([[2]]);
    expect(callsOf(qb, "limit")).toEqual([[2]]);
    expect(qb.where.join(" ")).toContain("page.name LIKE :search");
    expect(qb.where.join(" ")).toContain("page.public = :filterPublic");
    expect(result.total).toBe(7);
    // reordenado conforme a janela, mesmo que o IN devolva em outra ordem
    expect(result.items.map((p) => p.id)).toEqual(["b", "a"]);
    expect(find).toHaveBeenCalledTimes(1);
    expect(find.mock.calls[0][0]).toMatchObject({ relations: ["sections"] });
  });

  it("janela vazia: não carrega seções", async () => {
    const { repo, find } = setup([], 3);
    const result = await repo.findListWithSections({ page: 9 }, true);
    expect(result).toEqual({ items: [], total: 3 });
    expect(find).not.toHaveBeenCalled();
  });

  it("sem page: ordem legada, sem janela e sem COUNT extra", async () => {
    const { repo, qb } = setup(["a", "b"]);
    const result = await repo.findListWithSections({}, false);
    expect(callsOf(qb, "orderBy")).toEqual([["page.id", "ASC"]]);
    expect(callsOf(qb, "limit")).toEqual([]);
    expect(qb.getCount).not.toHaveBeenCalled();
    expect(qb.where).toEqual(["page.public = :visiblePublic"]);
    expect(result.total).toBe(2);
  });

  it("visitante com public=false: as duas condições vão ao banco (nunca vaza privadas)", async () => {
    const { repo, qb } = setup([]);
    await repo.findListWithSections({ public: false }, false);
    expect(qb.params).toMatchObject({
      visiblePublic: true,
      filterPublic: false,
    });
  });
});
