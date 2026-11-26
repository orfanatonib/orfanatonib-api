import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { PagelaFiltersDto } from "./pagela-filters.dto";
import { PagelaPaginatedQueryDto } from "./paginated.dto";

const failing = (payload: Record<string, unknown>): string[] =>
  validateSync(plainToInstance(PagelaFiltersDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe("PagelaFiltersDto", () => {
  it("aceita vazio e os filtros e a ordenação válidos", () => {
    expect(failing({})).toEqual([]);
    expect(
      failing({
        shelteredId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
        year: "2026",
        visit: "2",
        present: "true",
        searchString: "ana",
        referenceFrom: "2026-01-01",
        referenceTo: "2026-12-31",
        sortBy: "referenceDate",
        order: "ASC",
      }),
    ).toEqual([]);
  });

  it.each([
    [{ sortBy: "notes" }, "sortBy"],
    [{ order: "UP" }, "order"],
    [{ referenceFrom: "01/01/2026" }, "referenceFrom"],
    [{ referenceTo: "amanhã" }, "referenceTo"],
  ])("recusa %j", (payload, property) => {
    expect(failing(payload)).toContain(property);
  });
});

describe("PagelaPaginatedQueryDto", () => {
  const failingPaged = (payload: Record<string, unknown>): string[] =>
    validateSync(plainToInstance(PagelaPaginatedQueryDto, payload), {
      whitelist: true,
      forbidNonWhitelisted: true,
    }).map((error) => error.property);

  it("converte page e limit em número e aceita os filtros", () => {
    const dto = plainToInstance(PagelaPaginatedQueryDto, {
      page: "2",
      limit: "50",
      sortBy: "period",
    });
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(50);
    expect(failingPaged({ page: "2", limit: "50", sortBy: "period" })).toEqual(
      [],
    );
  });

  it.each([
    [{ page: "0" }, "page"],
    [{ limit: "201" }, "limit"],
    [{ sortBy: "notes" }, "sortBy"],
    [{ foo: "bar" }, "foo"],
  ])("recusa %j", (payload, property) => {
    expect(failingPaged(payload)).toContain(property);
  });
});
