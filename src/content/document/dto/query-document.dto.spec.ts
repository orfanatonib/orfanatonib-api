import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { QueryDocumentDto } from "./query-document.dto";

const failing = (payload: Record<string, unknown>): string[] =>
  validateSync(plainToInstance(QueryDocumentDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe("QueryDocumentDto", () => {
  it("aceita vazio e todos os filtros válidos", () => {
    expect(failing({})).toEqual([]);
    expect(
      failing({
        search: "guia",
        uploadType: "upload",
        createdFrom: "2026-01-01",
        createdTo: "2026-12-31",
        sortBy: "name",
        order: "DESC",
        page: "1",
        limit: "12",
      }),
    ).toEqual([]);
    expect(failing({ uploadType: "link" })).toEqual([]);
  });

  it.each([
    [{ uploadType: "s3" }, "uploadType"],
    [{ sortBy: "description" }, "sortBy"],
    [{ createdTo: "2026-13-01" }, "createdTo"],
    [{ page: "0" }, "page"],
    [{ limit: "101" }, "limit"],
    [{ public: "true" }, "public"],
  ])("recusa %j", (payload, field) => {
    expect(failing(payload)).toContain(field);
  });
});
