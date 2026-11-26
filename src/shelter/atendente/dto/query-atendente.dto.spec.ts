import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { QueryAtendenteDto } from "./query-atendente.dto";

const parse = (payload: Record<string, unknown>) =>
  plainToInstance(QueryAtendenteDto, payload);
const failing = (payload: Record<string, unknown>): string[] =>
  validateSync(parse(payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe("QueryAtendenteDto", () => {
  it("sem nada: página 1, 10 por página (a rota sempre foi paginada)", () => {
    const dto = parse({});
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
    expect(failing({})).toEqual([]);
  });

  it("aceita todos os filtros válidos", () => {
    expect(
      failing({
        search: "maria",
        attendableType: "user",
        attendableId: "abc",
        documents: "only_federal",
        createdFrom: "2026-01-01",
        createdTo: "2026-12-31",
        sortBy: "name",
        order: "ASC",
        page: "2",
        limit: "100",
      }),
    ).toEqual([]);
  });

  it.each([
    [{ documents: "none" }, "documents"],
    [{ sortBy: "attendableId" }, "sortBy"],
    [{ attendableType: "shelter" }, "attendableType"],
    [{ createdFrom: "01/01/2026" }, "createdFrom"],
    [{ createdTo: "2026-02-30" }, "createdTo"],
    [{ order: "UP" }, "order"],
    [{ page: "0" }, "page"],
    [{ limit: "101" }, "limit"],
    [{ foo: "bar" }, "foo"],
  ])("recusa %j", (payload, field) => {
    expect(failing(payload)).toContain(field);
  });
});
