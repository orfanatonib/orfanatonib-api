import { DataSource } from "typeorm";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { FeedbackCategory } from "../entity/feedback-category.enum";
import { SiteFeedbackSortBy } from "../enums/site-feedback-sort-by.enum";
import { SiteFeedbackRepository } from "./site-feedback.repository";

const argOf = (mock: jest.Mock, call: number, arg: number): unknown =>
  (mock.mock.calls[call] as unknown[])[arg];

function build() {
  const qb: Record<string, jest.Mock> = {
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[{ id: "f1" }], 9]),
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
  const repo = new SiteFeedbackRepository({
    createEntityManager: () => ({}),
  } as unknown as DataSource);
  jest
    .spyOn(repo, "createQueryBuilder")
    .mockReturnValue(
      qb as unknown as ReturnType<typeof repo.createQueryBuilder>,
    );
  return { qb, repo };
}

describe("SiteFeedbackRepository.findFiltered", () => {
  it("sem filtros: createdAt DESC e sem recorte", async () => {
    const { qb, repo } = build();
    await expect(repo.findFiltered()).resolves.toEqual({
      items: [{ id: "f1" }],
      total: 9,
    });
    expect(qb.andWhere).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith("f.createdAt", SortOrder.DESC);
    expect(qb.take).not.toHaveBeenCalled();
  });

  it("read, categoria e nota filtram no banco", async () => {
    const { qb, repo } = build();
    await repo.findFiltered({
      read: false,
      category: FeedbackCategory.COMPLAINT,
      rating: 2,
    });
    expect(qb.andWhere).toHaveBeenCalledWith("f.read = :read", {
      read: false,
    });
    expect(qb.andWhere).toHaveBeenCalledWith("f.category = :category", {
      category: FeedbackCategory.COMPLAINT,
    });
    expect(qb.andWhere).toHaveBeenCalledWith("f.rating = :rating", {
      rating: 2,
    });
  });

  it("rating=0 não é ignorado como se fosse vazio", async () => {
    const { qb, repo } = build();
    await repo.findFiltered({ rating: 0 });
    expect(qb.andWhere).toHaveBeenCalledWith("f.rating = :rating", {
      rating: 0,
    });
  });

  it("busca em nome, e-mail e comentário com LIKE escapado", async () => {
    const { qb, repo } = build();
    await repo.findFiltered({ search: "50%_" });
    const clause = String(argOf(qb.andWhere, 0, 0));
    for (const column of ["name", "email", "comment"]) {
      expect(clause).toContain(`f.${column} LIKE :search ESCAPE`);
    }
    expect(argOf(qb.andWhere, 0, 1)).toEqual({ search: "%50\\%\\_%" });
  });

  it("intervalo, sortBy=rating ASC e página 2", async () => {
    const { qb, repo } = build();
    await repo.findFiltered({
      createdTo: "2026-05-10",
      sortBy: SiteFeedbackSortBy.RATING,
      order: SortOrder.ASC,
      page: 2,
      limit: 5,
    });
    expect(argOf(qb.andWhere, 0, 1)).toEqual({
      createdTo: new Date(2026, 4, 10, 23, 59, 59, 999),
    });
    expect(qb.orderBy).toHaveBeenCalledWith("f.rating", SortOrder.ASC);
    expect(qb.skip).toHaveBeenCalledWith(5);
    expect(qb.take).toHaveBeenCalledWith(5);
  });
});
