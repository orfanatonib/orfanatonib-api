import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { CreatePagelaDto } from "./create-pagela.dto";
import { UpdatePagelaDto } from "./update-pagela.dto";

const failing = <T extends object>(
  type: new () => T,
  payload: Record<string, unknown>,
): string[] =>
  validateSync(
    plainToInstance(type, payload, { enableImplicitConversion: true }),
  ).map((error) => error.property);

const validCreate = {
  shelteredId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  memberProfileId: "3f2504e0-4f89-41d3-9a0c-0305e82c3302",
  referenceDate: "2026-11-10",
  visit: 1,
  present: true,
};

describe("CreatePagelaDto / UpdatePagelaDto — present", () => {
  it.each([true, false])("accepts the real boolean %p", (present) => {
    expect(failing(CreatePagelaDto, { ...validCreate, present })).toEqual([]);
    expect(failing(UpdatePagelaDto, { present })).toEqual([]);
  });

  it.each(["talvez", "false", 1, 0])(
    "rejects %p instead of letting the implicit conversion turn it into true",
    (present) => {
      expect(failing(CreatePagelaDto, { ...validCreate, present })).toContain(
        "present",
      );
      expect(failing(UpdatePagelaDto, { present })).toContain("present");
    },
  );

  it("an update may omit the presence", () => {
    expect(failing(UpdatePagelaDto, { notes: "só a nota" })).toEqual([]);
  });
});
