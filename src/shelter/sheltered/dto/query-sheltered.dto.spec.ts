import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { QueryShelteredDto } from "./query-sheltered.dto";
import { ShelteredOrderBy } from "../enums/sheltered-order-by.enum";
import { ShelteredGender } from "../enums/sheltered-gender.enum";
import { SHELTERED_LIMIT_MAX } from "../constants";

const transform = (payload: Record<string, unknown>): QueryShelteredDto =>
  plainToInstance(QueryShelteredDto, payload, {
    enableImplicitConversion: true,
  });

const failingProperties = (payload: Record<string, unknown>): string[] =>
  validateSync(transform(payload)).map((error) => error.property);

describe("QueryShelteredDto", () => {
  it("applies the documented defaults for an empty query", () => {
    const dto = transform({});

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto).toMatchObject({
      page: 1,
      limit: 20,
      orderBy: ShelteredOrderBy.NAME,
      order: SortOrder.ASC,
    });
  });

  it("coerces the numeric query string values", () => {
    const dto = transform({ page: "3", limit: "50" });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(50);
  });

  it("caps the page size so a client cannot request an unbounded list", () => {
    expect(failingProperties({ limit: SHELTERED_LIMIT_MAX + 1 })).toContain(
      "limit",
    );
    expect(failingProperties({ page: 0 })).toContain("page");
  });

  it("accepts every filter the management screen sends", () => {
    const dto = transform({
      searchString: "Maria",
      shelterSearchingString: "Esperança",
      addressFilter: "Centro",
      shelterId: "6f1c3c62-0f6a-4f4b-9a3f-0b5f7f2a1d11",
      gender: ShelteredGender.FEMALE,
      birthDateFrom: "2010-01-01",
      birthDateTo: "2020-12-31",
      joinedFrom: "2024-01-01",
      joinedTo: "2024-12-31",
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it("rejects a sort field outside the allowlist", () => {
    expect(failingProperties({ orderBy: "guardianPhone" })).toContain(
      "orderBy",
    );
  });

  it("rejects an unsupported sort direction, gender and malformed dates", () => {
    expect(failingProperties({ order: "asc" })).toContain("order");
    expect(failingProperties({ gender: "X" })).toContain("gender");
    expect(failingProperties({ birthDateFrom: "01/01/2010" })).toContain(
      "birthDateFrom",
    );
    expect(failingProperties({ shelterId: "not-a-uuid" })).toContain(
      "shelterId",
    );
  });
});
