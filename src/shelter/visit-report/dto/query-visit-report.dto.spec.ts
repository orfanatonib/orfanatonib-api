import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { QueryVisitReportDto } from "./query-visit-report.dto";

const failing = (payload: Record<string, unknown>): string[] =>
  validateSync(plainToInstance(QueryVisitReportDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe("QueryVisitReportDto", () => {
  it("aceita vazio e todos os filtros válidos", () => {
    expect(failing({})).toEqual([]);
    expect(
      failing({
        search: "abrigo",
        scheduleId: "s",
        teamId: "t",
        shelterId: "sh",
        visitFrom: "2026-01-01",
        visitTo: "2026-12-31",
        createdFrom: "2026-01-01",
        createdTo: "2026-12-31",
        sortBy: "visitDate",
        order: "ASC",
        page: "2",
        limit: "50",
      }),
    ).toEqual([]);
  });

  it.each([
    [{ sortBy: "observation" }, "sortBy"],
    [{ visitFrom: "01/01/2026" }, "visitFrom"],
    [{ visitTo: "ontem" }, "visitTo"],
    [{ createdFrom: "x" }, "createdFrom"],
    [{ order: "UP" }, "order"],
    [{ page: "0" }, "page"],
    [{ limit: "101" }, "limit"],
    [{ desconhecido: "1" }, "desconhecido"],
  ])("recusa %j", (payload, property) => {
    expect(failing(payload)).toContain(property);
  });
});
