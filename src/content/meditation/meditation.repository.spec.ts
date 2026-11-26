import { Repository } from "typeorm";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { MeditationRepository } from "./meditation.repository";
import { MeditationEntity } from "./entities/meditation.entity";
import { MeditationPeriod } from "./enums/meditation-period.enum";
import { MeditationSortBy } from "./enums/meditation-sort-by.enum";
import { todayLocalIso } from "./utils/meditation-filters.util";

const TODAY = "2026-11-22";

const argOf = (mock: jest.Mock, call: number, arg: number): unknown =>
  (mock.mock.calls[call] as unknown[])[arg];

function build() {
  const qb: Record<string, jest.Mock> = {
    leftJoinAndSelect: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[{ id: "m1" }], 7]),
  };
  for (const key of [
    "leftJoinAndSelect",
    "andWhere",
    "orderBy",
    "addOrderBy",
    "skip",
    "take",
  ] as const) {
    qb[key].mockReturnValue(qb);
  }
  const typeorm = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
  const repo = new MeditationRepository(
    typeorm as unknown as Repository<MeditationEntity>,
  );
  const wheres = (): string[] =>
    qb.andWhere.mock.calls.map((call: unknown[]) => String(call[0]));
  return { qb, repo, wheres };
}

describe("MeditationRepository.findFiltered", () => {
  it("sem filtros: ordem legada startDate ASC e sem recorte", async () => {
    const { qb, repo } = build();
    const result = await repo.findFiltered({}, TODAY);
    expect(result).toEqual({ items: [{ id: "m1" }], total: 7 });
    expect(qb.andWhere).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith("m.startDate", SortOrder.ASC);
    expect(qb.skip).not.toHaveBeenCalled();
    expect(qb.take).not.toHaveBeenCalled();
  });

  it("com page e sem sortBy: startDate DESC e janela skip/take", async () => {
    const { qb, repo } = build();
    await repo.findFiltered({ page: 3, limit: 5 }, TODAY);
    expect(qb.orderBy).toHaveBeenCalledWith("m.startDate", SortOrder.DESC);
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(5);
  });

  it("sortBy sem page ordena DESC por padrão e respeita order", async () => {
    const first = build();
    await first.repo.findFiltered({ sortBy: MeditationSortBy.TOPIC }, TODAY);
    expect(first.qb.orderBy).toHaveBeenCalledWith("m.topic", SortOrder.DESC);
    const second = build();
    await second.repo.findFiltered(
      { sortBy: MeditationSortBy.CREATED_AT, order: SortOrder.ASC },
      TODAY,
    );
    expect(second.qb.orderBy).toHaveBeenCalledWith(
      "m.createdAt",
      SortOrder.ASC,
    );
  });

  it("busca escapa curingas e usa ESCAPE", async () => {
    const { qb, repo, wheres } = build();
    await repo.findFiltered({ search: "  50%_x  " }, TODAY);
    expect(wheres()[0]).toContain("m.topic LIKE :search ESCAPE");
    expect(argOf(qb.andWhere, 0, 1)).toEqual({ search: "%50\\%\\_x%" });
  });

  it.each([
    [MeditationPeriod.CURRENT, "m.startDate <= :today AND m.endDate >= :today"],
    [MeditationPeriod.UPCOMING, "m.startDate > :today"],
    [MeditationPeriod.PAST, "m.endDate < :today"],
  ])("period=%s vira condição no banco contra hoje", async (period, clause) => {
    const { qb, repo, wheres } = build();
    await repo.findFiltered({ period }, TODAY);
    expect(wheres()).toEqual([clause]);
    expect(argOf(qb.andWhere, 0, 1)).toEqual({ today: TODAY });
  });

  it("startFrom/startTo e createdFrom/createdTo (dia inclusivo, UTC)", async () => {
    const { qb, repo, wheres } = build();
    await repo.findFiltered(
      {
        startFrom: "2026-01-01",
        startTo: "2026-01-31",
        createdFrom: "2026-02-01",
        createdTo: "2026-02-02",
      },
      TODAY,
    );
    expect(wheres()).toEqual([
      "m.startDate >= :startFrom",
      "m.startDate <= :startTo",
      "m.createdAt >= :createdFrom",
      "m.createdAt <= :createdTo",
    ]);
    expect(argOf(qb.andWhere, 2, 1)).toEqual({
      createdFrom: new Date("2026-02-01T00:00:00.000"),
    });
    expect(argOf(qb.andWhere, 3, 1)).toEqual({
      createdTo: new Date("2026-02-02T23:59:59.999"),
    });
  });

  it("findAllWithRelations devolve só os itens (consumidores internos)", async () => {
    const { repo } = build();
    await expect(repo.findAllWithRelations()).resolves.toEqual([{ id: "m1" }]);
  });
});

describe("todayLocalIso", () => {
  it("formata a data local com zeros à esquerda", () => {
    expect(todayLocalIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
