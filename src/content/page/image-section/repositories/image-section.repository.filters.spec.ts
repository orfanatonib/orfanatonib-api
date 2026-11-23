import { qbCalls, recordingQb } from "src/shared/list-query/list-query.testing";
import { ImageSectionReviewStatus } from "../enums/image-section-review-status.enum";
import { ImageSectionSortBy } from "../enums/image-section-sort-by.enum";
import { ImageSectionRepository } from "./image-section.repository";

function setup(total = 0) {
  const qb = recordingQb([], total);
  const repo = new ImageSectionRepository({
    createEntityManager: () => ({}),
  } as never);
  jest.spyOn(repo, "createQueryBuilder").mockReturnValue(qb as never);
  return { repo, qb };
}

describe("ImageSectionRepository.findQueue", () => {
  it("sem filtros e sem page: só a fila sem galeria, ordem legada (sem ORDER BY) e sem janela", async () => {
    const { repo, qb } = setup();
    await repo.findQueue({});
    expect(qb.clauses).toEqual(["page.id IS NULL"]);
    expect(qbCalls(qb, "orderBy")).toEqual([]);
    expect(qbCalls(qb, "skip")).toEqual([]);
  });

  it("todos os filtros combinados vão ao banco, com LIKE escapado", async () => {
    const { repo, qb } = setup(9);
    const result = await repo.findQueue({
      search: "50%_",
      reviewStatus: ImageSectionReviewStatus.REJECTED,
      public: false,
      createdFrom: "2026-01-01",
      createdTo: "2026-01-31",
      authorId: "u1",
      sortBy: ImageSectionSortBy.CAPTION,
      order: "ASC" as never,
      page: 3,
      limit: 4,
    });
    const text = qb.clauses.join(" | ");
    expect(text).toContain("s.caption LIKE :search ESCAPE");
    expect(text).toContain("author.name LIKE :search");
    expect(text).toContain("s.reviewStatus = :reviewStatus");
    expect(text).toContain("s.public = :isPublic");
    expect(text).toContain("author.id = :authorId");
    expect(qb.params.search).toBe("%50\\%\\_%");
    expect(qb.params.isPublic).toBe(false);
    expect(qb.params.createdFrom).toEqual(new Date("2026-01-01T00:00:00.000"));
    expect(qb.params.createdTo).toEqual(new Date("2026-01-31T23:59:59.999"));
    expect(qbCalls(qb, "orderBy")).toEqual([["s.caption", "ASC"]]);
    expect(qbCalls(qb, "skip")).toEqual([[8]]);
    expect(qbCalls(qb, "take")).toEqual([[4]]);
    expect(result.total).toBe(9);
  });

  it("com page e sem sortBy: createdAt DESC por padrão", async () => {
    const { repo, qb } = setup();
    await repo.findQueue({ page: 1 });
    expect(qbCalls(qb, "orderBy")).toEqual([["s.createdAt", "DESC"]]);
  });
});
