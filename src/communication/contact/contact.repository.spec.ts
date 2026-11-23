import { DataSource } from "typeorm";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { ContactRepository } from "./contact.repository";
import { ContactSortBy } from "./enums/contact-sort-by.enum";

const argOf = (mock: jest.Mock, call: number, arg: number): unknown =>
  (mock.mock.calls[call] as unknown[])[arg];

function build() {
  const qb: Record<string, jest.Mock> = {
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[{ id: "c1" }], 9]),
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
  const repo = new ContactRepository({
    createEntityManager: () => ({}),
  } as unknown as DataSource);
  jest
    .spyOn(repo, "createQueryBuilder")
    .mockReturnValue(
      qb as unknown as ReturnType<typeof repo.createQueryBuilder>,
    );
  return { qb, repo };
}

describe("ContactRepository.findFiltered", () => {
  it("sem filtros: createdAt DESC, lidos e não lidos, sem recorte", async () => {
    const { qb, repo } = build();
    await expect(repo.findFiltered()).resolves.toEqual({
      items: [{ id: "c1" }],
      total: 9,
    });
    expect(qb.andWhere).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith("c.createdAt", SortOrder.DESC);
    expect(qb.take).not.toHaveBeenCalled();
  });

  it.each([true, false])("read=%s filtra no banco", async (value) => {
    const { qb, repo } = build();
    await repo.findFiltered({ read: value });
    expect(qb.andWhere).toHaveBeenCalledWith("c.read = :read", {
      read: value,
    });
  });

  it("busca em nome, e-mail, telefone e mensagem com LIKE escapado", async () => {
    const { qb, repo } = build();
    await repo.findFiltered({ search: "100%" });
    const clause = String(argOf(qb.andWhere, 0, 0));
    for (const column of ["name", "email", "phone", "message"]) {
      expect(clause).toContain(`c.${column} LIKE :search ESCAPE`);
    }
    expect(argOf(qb.andWhere, 0, 1)).toEqual({ search: "%100\\%%" });
  });

  it("intervalo inclusivo, sortBy=name e página 3", async () => {
    const { qb, repo } = build();
    await repo.findFiltered({
      createdFrom: "2026-05-01",
      createdTo: "2026-05-10",
      sortBy: ContactSortBy.NAME,
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
    expect(qb.orderBy).toHaveBeenCalledWith("c.name", SortOrder.ASC);
    expect(qb.skip).toHaveBeenCalledWith(8);
    expect(qb.take).toHaveBeenCalledWith(4);
  });
});
