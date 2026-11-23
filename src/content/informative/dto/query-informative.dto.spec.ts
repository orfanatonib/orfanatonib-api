import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { QueryInformativeDto } from "./query-informative.dto";

const parse = (payload: Record<string, unknown>) =>
  plainToInstance(QueryInformativeDto, payload);
const failing = (payload: Record<string, unknown>): string[] =>
  validateSync(parse(payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe("QueryInformativeDto", () => {
  it("aceita vazio e todos os filtros válidos", () => {
    expect(failing({})).toEqual([]);
    expect(
      failing({
        search: "aviso",
        public: "false",
        createdFrom: "2026-01-01",
        createdTo: "2026-12-31",
        sortBy: "title",
        order: "ASC",
        page: "2",
        limit: "50",
      }),
    ).toEqual([]);
  });

  it("converte public=true|false para booleano", () => {
    expect(parse({ public: "true" }).public).toBe(true);
    expect(parse({ public: "false" }).public).toBe(false);
  });

  it.each([
    [{ public: "talvez" }, "public"],
    [{ sortBy: "route" }, "sortBy"],
    [{ createdFrom: "01-01-2026" }, "createdFrom"],
    [{ page: "0" }, "page"],
    [{ limit: "101" }, "limit"],
    [{ uploadType: "link" }, "uploadType"],
  ])("recusa %j", (payload, field) => {
    expect(failing(payload)).toContain(field);
  });
});
