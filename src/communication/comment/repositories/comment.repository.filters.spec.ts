import { qbCalls, recordingQb } from "src/shared/list-query/list-query.testing";
import { CommentSortBy } from "../enums/comment-sort-by.enum";
import { CommentRepository } from "./comment.repository";

function setup(total = 0) {
  const qb = recordingQb([], total);
  const repo = new CommentRepository({
    createEntityManager: () => ({}),
  } as never);
  jest.spyOn(repo, "createQueryBuilder").mockReturnValue(qb as never);
  return { repo, qb };
}

describe("CommentRepository.findFiltered", () => {
  it("sem filtros: createdAt DESC, sem janela", async () => {
    const { repo, qb } = setup();
    await repo.findFiltered({});
    expect(qb.clauses).toEqual([]);
    expect(qbCalls(qb, "orderBy")).toEqual([["c.createdAt", "DESC"]]);
    expect(qbCalls(qb, "skip")).toEqual([]);
  });

  it("published=false e published=true chegam ao banco (false não é ignorado)", async () => {
    const a = setup();
    await a.repo.findFiltered({ published: false });
    expect(a.qb.params.published).toBe(false);
    const b = setup();
    await b.repo.findFiltered({ published: true });
    expect(b.qb.params.published).toBe(true);
  });

  it("filtros combinados com janela", async () => {
    const { repo, qb } = setup(40);
    const result = await repo.findFiltered({
      search: "x%",
      shelter: "Esperança",
      published: true,
      createdFrom: "2026-03-01",
      sortBy: CommentSortBy.NAME,
      order: "ASC" as never,
      page: 3,
      limit: 5,
    });
    const text = qb.clauses.join(" | ");
    expect(text).toContain("c.name LIKE :search ESCAPE");
    expect(text).toContain("c.neighborhood LIKE :search");
    expect(text).toContain("c.shelter LIKE :shelter");
    expect(qb.params.search).toBe("%x\\%%");
    expect(qbCalls(qb, "orderBy")).toEqual([["c.name", "ASC"]]);
    expect(qbCalls(qb, "skip")).toEqual([[10]]);
    expect(qbCalls(qb, "take")).toEqual([[5]]);
    expect(result.total).toBe(40);
  });
});
