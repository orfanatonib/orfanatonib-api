import { callsOf, fakeQb } from "../../page-list-query.testing";
import { IdeasPageRepository } from "./ideas-page.repository";

function setup(ids: string[], total = ids.length) {
  const qb = fakeQb(
    ids.map((id) => ({ id })),
    total,
  );
  const repo = new IdeasPageRepository({
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

describe("IdeasPageRepository.findListWithSections", () => {
  it("paginado: pagina os ids no banco, conta com os filtros e só então carrega as seções", async () => {
    const { repo, qb, find } = setup(["b", "a"], 7);
    const result = await repo.findListWithSections({
      search: "x",
      page: 2,
      limit: 2,
      sortBy: "title" as never,
    });
    expect(callsOf(qb, "select")).toEqual([["page.id"]]);
    expect(callsOf(qb, "orderBy")).toEqual([["page.title", "DESC"]]);
    expect(callsOf(qb, "offset")).toEqual([[2]]);
    expect(callsOf(qb, "limit")).toEqual([[2]]);
    expect(qb.where.join(" ")).toContain("page.title LIKE :search");
    expect(qb.where.join(" ")).toContain("page.subtitle LIKE :search");
    expect(qb.where.join(" ")).toContain("page.description LIKE :search");
    expect(result.total).toBe(7);
    // reordenado conforme a janela, mesmo que o IN devolva em outra ordem
    expect(result.items.map((p) => p.id)).toEqual(["b", "a"]);
    expect(find).toHaveBeenCalledTimes(1);
    expect(find.mock.calls[0][0]).toMatchObject({
      relations: ["route", "sections", "sections.user"],
    });
  });

  it("janela vazia: não carrega seções", async () => {
    const { repo, find } = setup([], 3);
    const result = await repo.findListWithSections({ page: 9 });
    expect(result).toEqual({ items: [], total: 3 });
    expect(find).not.toHaveBeenCalled();
  });

  it("sem page: ordem legada (a página de ideias é sempre privada: sem filtro public), sem janela e sem COUNT extra", async () => {
    const { repo, qb } = setup(["a", "b"]);
    const result = await repo.findListWithSections({});
    expect(callsOf(qb, "orderBy")).toEqual([["page.id", "ASC"]]);
    expect(callsOf(qb, "limit")).toEqual([]);
    expect(qb.getCount).not.toHaveBeenCalled();
    expect(qb.where).toEqual([]);
    expect(result.total).toBe(2);
  });
});
