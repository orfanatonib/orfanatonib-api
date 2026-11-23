import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { QueryMeditationDto } from "./query-meditation.dto";

const failing = (payload: Record<string, unknown>): string[] =>
  validateSync(plainToInstance(QueryMeditationDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe("QueryMeditationDto", () => {
  it("aceita vazio e todos os filtros válidos", () => {
    expect(failing({})).toEqual([]);
    expect(
      failing({
        search: "paz",
        period: "current",
        startFrom: "2026-01-01",
        startTo: "2026-12-31",
        createdFrom: "2026-01-01",
        createdTo: "2026-12-31",
        sortBy: "topic",
        order: "ASC",
        page: "2",
        limit: "100",
      }),
    ).toEqual([]);
  });

  it.each([
    [{ period: "future" }, "period"],
    [{ sortBy: "id" }, "sortBy"],
    [{ startFrom: "01/01/2026" }, "startFrom"],
    [{ startTo: "2026-02-31" }, "startTo"],
    [{ createdFrom: "ontem" }, "createdFrom"],
    [{ page: "0" }, "page"],
    [{ limit: "101" }, "limit"],
    [{ order: "UP" }, "order"],
    [{ desconhecido: "x" }, "desconhecido"],
  ])("recusa %j", (payload, field) => {
    expect(failing(payload)).toContain(field);
  });
});
