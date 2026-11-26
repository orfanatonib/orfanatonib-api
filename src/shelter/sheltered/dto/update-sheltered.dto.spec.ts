import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { UpdateShelteredDto } from "./update-sheltered.dto";
import { ShelteredGender } from "../enums/sheltered-gender.enum";

const transform = (payload: Record<string, unknown>): UpdateShelteredDto =>
  plainToInstance(UpdateShelteredDto, payload, {
    enableImplicitConversion: true,
  });

const failingProperties = (payload: Record<string, unknown>): string[] =>
  validateSync(transform(payload)).map((error) => error.property);

describe("UpdateShelteredDto — active", () => {
  it.each(["talvez", "false", 5, null])(
    "rejects %p instead of coercing it to true (implicit conversion must not decide)",
    (value) => {
      expect(failingProperties({ active: value })).toContain("active");
    },
  );

  it.each([true, false])("accepts the real boolean %p", (value) => {
    expect(failingProperties({ active: value })).toEqual([]);
  });
});

describe("UpdateShelteredDto — colunas NOT NULL", () => {
  it.each(["name", "gender", "active"])(
    "an explicit null on %s is a validation error, not a 500 from the database",
    (field) => {
      expect(failingProperties({ [field]: null })).toContain(field);
    },
  );

  it("omitting them is still fine (partial update)", () => {
    expect(failingProperties({})).toEqual([]);
  });
});

describe("UpdateShelteredDto", () => {
  it("accepts an empty payload, since every field is optional", () => {
    expect(validateSync(transform({}))).toHaveLength(0);
  });

  it("keeps an explicit null on shelterId so the relation can be detached", () => {
    const dto = transform({ shelterId: null });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.shelterId).toBeNull();
    expect("shelterId" in dto).toBe(true);
  });

  it("keeps an explicit null on address so the relation can be detached", () => {
    const dto = transform({ address: null });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.address).toBeNull();
  });

  it("distinguishes an omitted field from an explicit null", () => {
    const dto = transform({ name: "Maria Souza" });

    expect(dto.shelterId).toBeUndefined();
    expect(dto.address).toBeUndefined();
  });

  it("still validates a shelterId that was supplied", () => {
    expect(failingProperties({ shelterId: "not-a-uuid" })).toContain(
      "shelterId",
    );
  });

  it("validates a partial address without requiring city and state", () => {
    expect(
      validateSync(transform({ address: { city: "Belém" } })),
    ).toHaveLength(0);
  });

  it("rejects a gender outside the domain enum", () => {
    expect(failingProperties({ gender: "X" })).toContain("gender");
    expect(
      validateSync(transform({ gender: ShelteredGender.MALE })),
    ).toHaveLength(0);
  });

  it("treats a blank guardian field as absent", () => {
    expect(
      validateSync(transform({ guardianName: "", guardianPhone: "" })),
    ).toHaveLength(0);
  });
});
