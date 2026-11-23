import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { QuerySheltersDto } from "./query-shelters.dto";

const errorsFor = async (raw: Record<string, unknown>): Promise<string[]> =>
  (await validate(plainToInstance(QuerySheltersDto, raw))).map(
    (error) => error.property,
  );

describe("QuerySheltersDto", () => {
  it("accepts the list filters together", async () => {
    await expect(
      errorsFor({
        page: "2",
        limit: "100",
        sort: "city",
        order: "DESC",
        searchString: "abc",
        city: "Manaus",
        state: "AM",
        createdFrom: "2026-01-01",
        createdTo: "2026-01-31",
      }),
    ).resolves.toEqual([]);
  });

  it.each([
    [{ page: "0" }, "page"],
    [{ limit: "101" }, "limit"],
    [{ sort: "teamsQuantity" }, "sort"],
    [{ searchString: "x".repeat(121) }, "searchString"],
    [{ createdFrom: "01/01/2026" }, "createdFrom"],
    [{ createdTo: "2026-13-40" }, "createdTo"],
  ])("rejects %j", async (raw, property) => {
    await expect(errorsFor(raw)).resolves.toContain(property);
  });
});
