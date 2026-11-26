import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { qbCalls, recordingQb } from "src/shared/list-query/list-query.testing";
import { IdeasPageEntity } from "../../ideas-page/entities/ideas-page.entity";
import { IdeasSectionEntity } from "../entities/ideas-section.entity";
import { IdeasSectionMediaType } from "../enums/ideas-section-media-type.enum";
import { IdeasSectionSortBy } from "../enums/ideas-section-sort-by.enum";
import { IdeasSectionRepository } from "./ideas-section.repository";

async function setup(total = 0) {
  const qb = recordingQb([], total);
  const moduleRef = await Test.createTestingModule({
    providers: [
      IdeasSectionRepository,
      {
        provide: getRepositoryToken(IdeasSectionEntity),
        useValue: { createQueryBuilder: jest.fn(() => qb) },
      },
      { provide: getRepositoryToken(IdeasPageEntity), useValue: {} },
    ],
  }).compile();
  return { repo: moduleRef.get(IdeasSectionRepository), qb };
}

describe("IdeasSectionRepository.findUnattachedFiltered", () => {
  it("sem filtros: fila sem página, createdAt DESC, sem janela", async () => {
    const { repo, qb } = await setup();
    await repo.findUnattachedFiltered({});
    expect(qb.clauses).toEqual(["page.id IS NULL"]);
    expect(qbCalls(qb, "orderBy")).toEqual([["s.createdAt", "DESC"]]);
    expect(qbCalls(qb, "skip")).toEqual([]);
  });

  it("filtros combinados: busca (título/descrição/autor), tipo de mídia, datas, ordem e janela", async () => {
    const { repo, qb } = await setup(30);
    const result = await repo.findUnattachedFiltered({
      search: "a_b",
      mediaType: IdeasSectionMediaType.VIDEO,
      createdFrom: "2026-02-01",
      createdTo: "2026-02-28",
      sortBy: IdeasSectionSortBy.TITLE,
      order: "ASC" as never,
      page: 2,
      limit: 12,
    });
    const text = qb.clauses.join(" | ");
    expect(text).toContain("s.title LIKE :search ESCAPE");
    expect(text).toContain("user.name LIKE :search");
    expect(text).toContain("FROM media_items mi");
    expect(qb.params.mediaType).toBe("video");
    expect(qb.params.search).toBe("%a\\_b%");
    expect(qbCalls(qb, "orderBy")).toEqual([["s.title", "ASC"]]);
    expect(qbCalls(qb, "skip")).toEqual([[12]]);
    expect(qbCalls(qb, "take")).toEqual([[12]]);
    expect(result.total).toBe(30);
  });
});
