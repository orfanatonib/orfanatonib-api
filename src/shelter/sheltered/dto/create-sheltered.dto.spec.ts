import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { CreateShelteredDto } from "./create-sheltered.dto";
import { ShelteredGender } from "../enums/sheltered-gender.enum";

const transform = (payload: Record<string, unknown>): CreateShelteredDto =>
  plainToInstance(CreateShelteredDto, payload, {
    enableImplicitConversion: true,
  });

const failingProperties = (payload: Record<string, unknown>): string[] =>
  validateSync(transform(payload)).map((error) => error.property);

const validPayload = {
  name: "Maria Silva",
  gender: ShelteredGender.FEMALE,
};

describe("CreateShelteredDto", () => {
  it("accepts the minimum payload: name and gender", () => {
    expect(validateSync(transform(validPayload))).toHaveLength(0);
  });

  it("requires name and gender", () => {
    const properties = failingProperties({});

    expect(properties).toEqual(expect.arrayContaining(["name", "gender"]));
  });

  it("rejects a gender outside the domain enum", () => {
    expect(
      failingProperties({ ...validPayload, gender: "Masculino" }),
    ).toContain("gender");
  });

  it("treats blank guardian fields as absent instead of invalid", () => {
    const errors = validateSync(
      transform({ ...validPayload, guardianName: "", guardianPhone: "" }),
    );

    expect(errors).toHaveLength(0);
  });

  it("validates the length of guardian fields that were filled in", () => {
    expect(failingProperties({ ...validPayload, guardianName: "A" })).toContain(
      "guardianName",
    );
    expect(
      failingProperties({ ...validPayload, guardianPhone: "123" }),
    ).toContain("guardianPhone");
  });

  it("validates the nested address and requires city and state", () => {
    const errors = validateSync(
      transform({ ...validPayload, address: { street: "Rua das Flores" } }),
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("address");
    expect(errors[0].children?.map((child) => child.property)).toEqual(
      expect.arrayContaining(["city", "state"]),
    );
  });

  it("accepts a complete address", () => {
    const errors = validateSync(
      transform({ ...validPayload, address: { city: "Manaus", state: "AM" } }),
    );

    expect(errors).toHaveLength(0);
  });

  it("rejects malformed dates and a non-uuid shelterId", () => {
    expect(
      failingProperties({ ...validPayload, birthDate: "02/04/2015" }),
    ).toContain("birthDate");
    expect(failingProperties({ ...validPayload, shelterId: "123" })).toContain(
      "shelterId",
    );
  });
});
