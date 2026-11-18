import { BadRequestException } from "@nestjs/common";

import { validateStructuredContent } from "./structured-content-policy.util";

describe("validateStructuredContent", () => {
  it("accepts bounded plain JSON and returns its stable serialization", () => {
    expect(
      validateStructuredContent({ title: "Esperança", items: [1, true, null] }),
    ).toBe('{"title":"Esperança","items":[1,true,null]}');
  });

  it("rejects obvious personal-data fields", () => {
    expect(() => validateStructuredContent({ childName: "A name" })).toThrow(
      BadRequestException,
    );
  });

  it("rejects non-finite numbers", () => {
    expect(() => validateStructuredContent({ score: Number.NaN })).toThrow(
      BadRequestException,
    );
  });

  it("rejects excessive nesting", () => {
    let value: Record<string, unknown> = {};
    const root = value;
    for (let index = 0; index < 14; index += 1) {
      const next: Record<string, unknown> = {};
      value.child = next;
      value = next;
    }
    expect(() => validateStructuredContent(root)).toThrow(BadRequestException);
  });
});
