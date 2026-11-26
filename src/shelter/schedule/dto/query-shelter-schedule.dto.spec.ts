import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import {
  QueryShelterScheduleDto,
  usesListFeatures,
} from "./query-shelter-schedule.dto";

const failing = (payload: Record<string, unknown>): string[] =>
  validateSync(plainToInstance(QueryShelterScheduleDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe("QueryShelterScheduleDto", () => {
  it("aceita vazio e todos os filtros válidos", () => {
    expect(failing({})).toEqual([]);
    expect(failing({ teamId: "t1" })).toEqual([]);
    expect(
      failing({
        search: "lição",
        shelterId: "s1",
        kind: "meeting",
        eventFrom: "2026-01-01",
        eventTo: "2026-12-31",
        createdFrom: "2026-01-01",
        createdTo: "2026-12-31",
        sortBy: "eventDate",
        order: "DESC",
        page: "2",
        limit: "12",
      }),
    ).toEqual([]);
  });

  it.each([
    [{ kind: "outro" }, "kind"],
    [{ sortBy: "lessonContent" }, "sortBy"],
    [{ eventFrom: "01/12/2026" }, "eventFrom"],
    [{ eventTo: "2026-13-01" }, "eventTo"],
    [{ page: "0" }, "page"],
    [{ limit: "101" }, "limit"],
    [{ order: "UP" }, "order"],
    [{ ignorado: "1" }, "ignorado"],
  ])("recusa %j", (payload, field) => {
    expect(failing(payload)).toContain(field);
  });

  it("só cai no caminho novo quando algo além do legado é pedido", () => {
    expect(usesListFeatures(undefined)).toBe(false);
    expect(usesListFeatures({})).toBe(false);
    expect(usesListFeatures({ teamId: "t1" })).toBe(false);
    expect(usesListFeatures({ search: "x" })).toBe(true);
    expect(usesListFeatures({ page: 1 })).toBe(true);
    expect(usesListFeatures({ sortBy: "createdAt" as never })).toBe(true);
  });
});
