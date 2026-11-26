import { Repository } from "typeorm";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { UploadType } from "src/shared/media/media-item/media-item.entity";
import { DocumentRepository } from "./document.repository";
import { DocumentEntity } from "./entities/document.entity";
import { DocumentSortBy } from "./enums/document-sort-by.enum";

const argOf = (mock: jest.Mock, call: number, arg: number): unknown =>
  (mock.mock.calls[call] as unknown[])[arg];

function build() {
  const qb: Record<string, jest.Mock> = {
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[{ id: "d1" }], 4]),
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
  const repo = new DocumentRepository(
    typeorm as unknown as Repository<DocumentEntity>,
  );
  return { qb, repo };
}

describe("DocumentRepository.findFiltered", () => {
  it("sem filtros: createdAt DESC, sem condição e sem recorte", async () => {
    const { qb, repo } = build();
    await expect(repo.findFiltered()).resolves.toEqual({
      items: [{ id: "d1" }],
      total: 4,
    });
    expect(qb.andWhere).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith("d.createdAt", SortOrder.DESC);
    expect(qb.take).not.toHaveBeenCalled();
  });

  it("busca em name/description com LIKE escapado", async () => {
    const { qb, repo } = build();
    await repo.findFiltered({ search: "a_b" });
    const clause = String(argOf(qb.andWhere, 0, 0));
    const params = argOf(qb.andWhere, 0, 1);
    expect(clause).toContain("d.name LIKE :search ESCAPE");
    expect(clause).toContain("d.description LIKE :search ESCAPE");
    expect(params).toEqual({ search: "%a\\_b%" });
  });

  it("uploadType vira subconsulta em media_items do alvo document", async () => {
    const { qb, repo } = build();
    await repo.findFiltered({ uploadType: UploadType.LINK });
    const clause = String(argOf(qb.andWhere, 0, 0));
    const params = argOf(qb.andWhere, 0, 1);
    expect(clause).toContain("EXISTS (SELECT 1 FROM media_items mi");
    expect(clause).toContain("mi.targetId = d.id");
    expect(params).toEqual({ mediaTarget: "Document", uploadType: "link" });
  });

  it("intervalo de criação e ordenação por name ASC com página 2", async () => {
    const { qb, repo } = build();
    await repo.findFiltered({
      createdFrom: "2026-03-01",
      createdTo: "2026-03-31",
      sortBy: DocumentSortBy.NAME,
      order: SortOrder.ASC,
      page: 2,
      limit: 10,
    });
    expect(qb.andWhere).toHaveBeenCalledTimes(2);
    expect(qb.orderBy).toHaveBeenCalledWith("d.name", SortOrder.ASC);
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(10);
  });
});
