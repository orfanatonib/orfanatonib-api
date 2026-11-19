import {
  ResourceConflictException,
  RuleException,
} from "src/common/exceptions";
import {
  errorCodeOf,
  LOG_ERROR_CODES,
} from "src/core/observability/utils/error-code.utils";
import { LogStorageKind } from "src/shared/providers/log-storage/enums";

import { assertQueryable, pickFilters, validateRange } from "./utils";

describe("validateRange", () => {
  it("aceita intervalo válido dentro do limite", () => {
    const range = validateRange("2026-09-01T00:00:00Z", "2026-09-05T00:00:00Z");
    expect(range.from.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-09-05T00:00:00.000Z");
  });

  it.each([
    ["x", "2026-09-05T00:00:00Z"],
    ["2026-09-05T00:00:00Z", "2026-09-05T00:00:00Z"],
    ["2026-09-06T00:00:00Z", "2026-09-05T00:00:00Z"],
    ["2026-08-01T00:00:00Z", "2026-09-05T00:00:00Z"],
  ])("recusa %s..%s", (from, to) => {
    expect(() => validateRange(from, to)).toThrow(RuleException);
  });
});

describe("pickFilters", () => {
  it("só campos allowlisted e preenchidos", () => {
    expect(
      pickFilters(
        {
          level: "error",
          errorCode: " ",
          sourceType: undefined,
          requestId: "x",
        },
        ["level", "errorCode", "sourceType"],
      ),
    ).toEqual({ level: "error" });
  });
});

describe("assertQueryable", () => {
  it("deixa passar storage consultável e recusa file com 409 LOG_9101", () => {
    expect(() =>
      assertQueryable({ queryable: true }, LogStorageKind.DynamoDb),
    ).not.toThrow();
    try {
      assertQueryable({ queryable: false }, LogStorageKind.File);
      throw new Error("deveria ter lançado");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ResourceConflictException);
      expect(errorCodeOf(error)).toBe(LOG_ERROR_CODES.LOG_QUERY_UNAVAILABLE);
      expect((error as ResourceConflictException).getStatus()).toBe(409);
    }
  });
});
