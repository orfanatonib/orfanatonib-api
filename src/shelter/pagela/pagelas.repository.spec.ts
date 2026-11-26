import { DataSource } from "typeorm";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { PagelasRepository } from "./pagelas.repository";
import { PagelaSortBy } from "./dto/pagela-filters.dto";

function build() {
  const qb: Record<string, jest.Mock> = {};
  for (const key of [
    "leftJoin",
    "addSelect",
    "andWhere",
    "orderBy",
    "addOrderBy",
    "skip",
    "take",
  ]) {
    qb[key] = jest.fn().mockReturnValue(qb);
  }
  qb.getManyAndCount = jest.fn().mockResolvedValue([[{ id: "p1" }], 7]);
  const typeorm = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
  const repo = new PagelasRepository(
    {} as DataSource,
    typeorm as unknown as ConstructorParameters<typeof PagelasRepository>[1],
    {} as ConstructorParameters<typeof PagelasRepository>[2],
    {} as ConstructorParameters<typeof PagelasRepository>[3],
  );
  return { qb, repo };
}

const clauses = (qb: Record<string, jest.Mock>): string[] =>
  qb.andWhere.mock.calls.map((call) => String((call as unknown[])[0]));

describe("PagelasRepository.findAllPaginated", () => {
  it("sem sortBy: ano e visita do mais novo ao mais antigo, recorte da página no banco", async () => {
    const { qb, repo } = build();
    await expect(repo.findAllPaginated(undefined, 2, 6)).resolves.toEqual({
      items: [{ id: "p1" }],
      total: 7,
    });
    expect(qb.orderBy).toHaveBeenCalledWith("p.year", SortOrder.DESC);
    expect(qb.addOrderBy).toHaveBeenCalledWith("p.visit", SortOrder.DESC);
    expect(qb.skip).toHaveBeenCalledWith(6);
    expect(qb.take).toHaveBeenCalledWith(6);
  });

  it("sortBy referenceDate e member usam as colunas da whitelist", async () => {
    const first = build();
    await first.repo.findAllPaginated(
      { sortBy: PagelaSortBy.REFERENCE_DATE, order: SortOrder.ASC },
      1,
      6,
    );
    expect(first.qb.orderBy).toHaveBeenCalledWith(
      "p.referenceDate",
      SortOrder.ASC,
    );

    const second = build();
    await second.repo.findAllPaginated({ sortBy: PagelaSortBy.MEMBER }, 1, 6);
    expect(second.qb.orderBy).toHaveBeenCalledWith(
      "memberUser.name",
      SortOrder.DESC,
    );
  });

  it("intervalo da data de referência vira condição no banco", async () => {
    const { qb, repo } = build();
    await repo.findAllPaginated(
      { referenceFrom: "2026-01-01", referenceTo: "2026-02-01" },
      1,
      6,
    );
    expect(clauses(qb)).toEqual(
      expect.arrayContaining([
        "p.referenceDate >= :referenceFrom",
        "p.referenceDate <= :referenceTo",
      ]),
    );
  });
});
