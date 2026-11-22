import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { UpdateShelteredStatusDto } from "./update-sheltered-status.dto";

const failing = (payload: Record<string, unknown>): string[] =>
  validateSync(
    plainToInstance(UpdateShelteredStatusDto, payload, {
      enableImplicitConversion: true,
    }),
  ).map((error) => error.property);

describe("UpdateShelteredStatusDto", () => {
  it.each([true, false])("accepts the real boolean %p", (value) => {
    expect(failing({ active: value })).toEqual([]);
  });

  it.each(["talvez", "false", 5, undefined])(
    "rejects %p instead of coercing it to true",
    (value) => {
      expect(failing({ active: value })).toContain("active");
    },
  );
});
