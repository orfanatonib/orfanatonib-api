import { DataSource } from "typeorm";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { VisitReportRepository } from "./visit-report.repository";
import { VisitReportSortBy } from "./enums/visit-report-sort-by.enum";

const argOf = (mock: jest.Mock, call: number, arg: number): unknown =>
  (mock.mock.calls[call] as unknown[])[arg];

function build(total = 3, ids = ["r2", "r1"]) {
  const qb: Record<string, jest.Mock> = {};
  for (const key of [
    "innerJoin",
    "andWhere",
    "orderBy",
    "addOrderBy",
    "offset",
    "limit",
    "select",
    "where",
  ]) {
    qb[key] = jest.fn().mockReturnValue(qb);
  }
  qb.getCount = jest.fn().mockResolvedValue(total);
  qb.getRawMany = jest.fn().mockResolvedValue(ids.map((id) => ({ id })));
  qb.getQuery = jest.fn().mockReturnValue("SUBQ");
  const find = jest
    .fn()
    .mockResolvedValue(
      [{ id: "r1" }, { id: "r2" }].filter((r) => ids.includes(r.id)),
    );
  const repo = { createQueryBuilder: jest.fn().mockReturnValue(qb), find };
  const ds = {
    getRepository: jest.fn().mockReturnValue(repo),
  } as unknown as DataSource;
  return { qb, find, repo: new VisitReportRepository(ds) };
}

const admin = { role: "admin", userId: "a" } as const;

describe("VisitReportRepository.findFiltered", () => {
  it("ator sem papel ou líder sem id: vazio, sem consultar o banco", async () => {
    const { qb, repo } = build();
    await expect(
      repo.findFiltered({ role: null, userId: "x" }),
    ).resolves.toEqual({ items: [], total: 0 });
    await expect(
      repo.findFiltered({ role: "leader", userId: null }),
    ).resolves.toEqual({ items: [], total: 0 });
    expect(qb.getCount).not.toHaveBeenCalled();
  });

  it("admin sem filtros: sem condição, createdAt DESC, sem recorte; itens na ordem dos ids", async () => {
    const { qb, repo } = build();
    const result = await repo.findFiltered(admin);
    expect(qb.andWhere).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith("r.createdAt", SortOrder.DESC);
    expect(qb.limit).not.toHaveBeenCalled();
    expect(result.total).toBe(3);
    expect(result.items.map((i) => i.id)).toEqual(["r2", "r1"]);
  });

  it("líder: restringe às equipes que lidera pelo id do usuário", async () => {
    const { qb, repo } = build();
    await repo.findFiltered({ role: "leader", userId: "u9" });
    expect(String(argOf(qb.andWhere, 0, 0))).toContain("t.id IN (SUBQ)");
    expect(argOf(qb.andWhere, 0, 1)).toEqual({ leaderUserId: "u9" });
  });

  it("ids de escopo, datas da visita e de criação viram condições no banco", async () => {
    const { qb, repo } = build();
    await repo.findFiltered(admin, {
      scheduleId: "s",
      teamId: "t",
      shelterId: "sh",
      visitFrom: "2026-01-01",
      visitTo: "2026-02-01",
      createdFrom: "2026-03-01",
      createdTo: "2026-03-02",
    });
    const clauses = qb.andWhere.mock.calls.map((c) =>
      String((c as unknown[])[0]),
    );
    expect(clauses).toEqual(
      expect.arrayContaining([
        "s.id = :scheduleId",
        "t.id = :teamId",
        "sh.id = :shelterId",
        "s.visitDate >= :visitFrom",
        "s.visitDate <= :visitTo",
        "r.createdAt >= :createdFrom",
        "r.createdAt <= :createdTo",
      ]),
    );
  });

  it("busca varre abrigo, equipe, observação, conteúdo e número com LIKE escapado", async () => {
    const { qb, repo } = build();
    await repo.findFiltered(admin, { search: "a_b" });
    const clause = String(argOf(qb.andWhere, 0, 0));
    for (const part of [
      "sh.name",
      "CONCAT('Equipe '",
      "r.observation",
      "s.lessonContent",
      "s.visitNumber",
    ]) {
      expect(clause).toContain(part);
    }
    expect(clause).toContain("ESCAPE");
    expect(argOf(qb.andWhere, 0, 1)).toEqual({ search: "%a\\_b%" });
  });

  it("sortBy e order mapeiam colunas da whitelist; com page recorta offset/limit", async () => {
    const { qb, repo } = build();
    await repo.findFiltered(admin, {
      sortBy: VisitReportSortBy.SHELTER,
      order: SortOrder.ASC,
      page: 3,
      limit: 5,
    });
    expect(qb.orderBy).toHaveBeenCalledWith("sh.name", SortOrder.ASC);
    expect(qb.addOrderBy).toHaveBeenCalledWith("r.id", "ASC");
    expect(qb.offset).toHaveBeenCalledWith(10);
    expect(qb.limit).toHaveBeenCalledWith(5);
  });

  it("total zero não carrega relações", async () => {
    const { find, repo } = build(0, []);
    await expect(repo.findFiltered(admin)).resolves.toEqual({
      items: [],
      total: 0,
    });
    expect(find).not.toHaveBeenCalled();
  });
});
