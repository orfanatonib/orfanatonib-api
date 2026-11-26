import { Repository } from "typeorm";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { InformativeRepository } from "./informative.repository";
import { InformativeEntity } from "./entities/informative.entity";
import { InformativeSortBy } from "./enums/informative-sort-by.enum";

const argOf = (mock: jest.Mock, call: number, arg: number): unknown =>
  (mock.mock.calls[call] as unknown[])[arg];

function build() {
  const qb: Record<string, jest.Mock> = {
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[{ id: "i1" }], 9]),
  };
  for (const key of [
    "andWhere",
    "orderBy",
    "addOrderBy",
    "skip",
    "take",
  ] as const) {
    qb[key].mockReturnValue(qb);
  }
  const typeorm = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
  const repo = new InformativeRepository(
    typeorm as unknown as Repository<InformativeEntity>,
  );
  return { qb, repo };
}

describe("InformativeRepository.findFiltered", () => {
  it("sem filtros: createdAt DESC, mostra públicos e privados, sem recorte", async () => {
    const { qb, repo } = build();
    await expect(repo.findFiltered()).resolves.toEqual({
      items: [{ id: "i1" }],
      total: 9,
    });
    expect(qb.andWhere).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith("i.createdAt", SortOrder.DESC);
    expect(qb.take).not.toHaveBeenCalled();
  });

  it.each([true, false])("public=%s filtra no banco", async (value) => {
    const { qb, repo } = build();
    await repo.findFiltered({ public: value });
    expect(qb.andWhere).toHaveBeenCalledWith("i.public = :isPublic", {
      isPublic: value,
    });
  });

  it("busca em title/description com LIKE escapado", async () => {
    const { qb, repo } = build();
    await repo.findFiltered({ search: "100%" });
    const clause = String(argOf(qb.andWhere, 0, 0));
    const params = argOf(qb.andWhere, 0, 1);
    expect(clause).toContain("i.title LIKE :search ESCAPE");
    expect(clause).toContain("i.description LIKE :search ESCAPE");
    expect(params).toEqual({ search: "%100\\%%" });
  });

  it("intervalo, sortBy=title e página 3", async () => {
    const { qb, repo } = build();
    await repo.findFiltered({
      createdTo: "2026-05-10",
      sortBy: InformativeSortBy.TITLE,
      order: SortOrder.ASC,
      page: 3,
      limit: 4,
    });
    expect(argOf(qb.andWhere, 0, 1)).toEqual({
      createdTo: new Date("2026-05-10T23:59:59.999"),
    });
    expect(qb.orderBy).toHaveBeenCalledWith("i.title", SortOrder.ASC);
    expect(qb.skip).toHaveBeenCalledWith(8);
    expect(qb.take).toHaveBeenCalledWith(4);
  });
});
