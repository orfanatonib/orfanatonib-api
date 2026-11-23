import { SortOrder } from "src/shared/enums/sort-order.enum";
import { AtendenteRepository } from "./atendente.repository";
import { AttendableType } from "./entities/attendable-type.enum";
import { AtendenteDocumentsFilter } from "./enums/atendente-documents-filter.enum";
import { AtendenteSortBy } from "./enums/atendente-sort-by.enum";

const argOf = (mock: jest.Mock, call: number, arg: number): unknown =>
  (mock.mock.calls[call] as unknown[])[arg];

function build() {
  const qb: Record<string, jest.Mock> = {
    leftJoin: jest.fn(),
    andWhere: jest.fn(),
    addSelect: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    offset: jest.fn(),
    limit: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[{ id: "a1" }], 7]),
  };
  for (const key of [
    "leftJoin",
    "andWhere",
    "addSelect",
    "orderBy",
    "addOrderBy",
    "offset",
    "limit",
  ] as const) {
    qb[key].mockReturnValue(qb);
  }
  const typeorm = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
  const repo = new AtendenteRepository(
    typeorm as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { qb, repo };
}

describe("AtendenteRepository.findAllPaginated", () => {
  it("sem filtros: createdAt DESC, página 1 de 10, tudo no banco", async () => {
    const { qb, repo } = build();
    await expect(repo.findAllPaginated({})).resolves.toEqual({
      data: [{ id: "a1" }],
      total: 7,
    });
    expect(qb.andWhere).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith("a.createdAt", SortOrder.DESC);
    expect(qb.offset).toHaveBeenCalledWith(0);
    expect(qb.limit).toHaveBeenCalledWith(10);
  });

  it("busca em nome do cadastro, do usuário e da integração com LIKE escapado", async () => {
    const { qb, repo } = build();
    await repo.findAllPaginated({ search: "50%" });
    const clause = String(argOf(qb.andWhere, 0, 0));
    for (const column of ["a.name", "u.name", "i.name"]) {
      expect(clause).toContain(`${column} LIKE :search ESCAPE`);
    }
    expect(argOf(qb.andWhere, 0, 1)).toEqual({ search: "%50\\%%" });
  });

  it("vínculo e id do vínculo filtram no banco", async () => {
    const { qb, repo } = build();
    await repo.findAllPaginated({
      attendableType: AttendableType.USER,
      attendableId: " u1 ",
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      "a.attendableType = :attendableType",
      { attendableType: AttendableType.USER },
    );
    expect(qb.andWhere).toHaveBeenCalledWith("a.attendableId = :attendableId", {
      attendableId: "u1",
    });
  });

  it.each([
    [AtendenteDocumentsFilter.COMPLETE, false],
    [AtendenteDocumentsFilter.ONLY_ESTADUAL, true],
    [AtendenteDocumentsFilter.ONLY_FEDERAL, true],
  ])(
    "documents=%s usa subconsulta em media_items",
    async (documents, negates) => {
      const { qb, repo } = build();
      await repo.findAllPaginated({ documents });
      const clause = String(argOf(qb.andWhere, 0, 0));
      expect(clause).toContain("me.targetId");
      expect(clause).toContain("mf.targetId");
      expect(clause.includes("NOT EXISTS")).toBe(negates);
      expect(argOf(qb.andWhere, 0, 1)).toEqual({
        estadualTargets: ["AtendenteEstadual", "Atendente"],
        federalTarget: "AtendenteFederal",
      });
    },
  );

  it("intervalo inclusivo, ordenação por nome exibido e página 3", async () => {
    const { qb, repo } = build();
    await repo.findAllPaginated({
      createdFrom: "2026-05-01",
      createdTo: "2026-05-10",
      sortBy: AtendenteSortBy.NAME,
      order: SortOrder.ASC,
      page: 3,
      limit: 4,
    });
    expect(argOf(qb.andWhere, 0, 1)).toEqual({
      createdFrom: new Date(2026, 4, 1, 0, 0, 0, 0),
    });
    expect(argOf(qb.andWhere, 1, 1)).toEqual({
      createdTo: new Date(2026, 4, 10, 23, 59, 59, 999),
    });
    expect(String(argOf(qb.addSelect, 0, 0))).toContain("COALESCE");
    expect(qb.orderBy).toHaveBeenCalledWith("display_name", SortOrder.ASC);
    expect(qb.offset).toHaveBeenCalledWith(8);
    expect(qb.limit).toHaveBeenCalledWith(4);
  });

  it("sortBy=updatedAt ordena pela coluna do cadastro", async () => {
    const { qb, repo } = build();
    await repo.findAllPaginated({ sortBy: AtendenteSortBy.UPDATED_AT });
    expect(qb.orderBy).toHaveBeenCalledWith("a.updatedAt", SortOrder.DESC);
  });
});
