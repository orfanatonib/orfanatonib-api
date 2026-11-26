import { isDateOnly, toDateOnly, toIsoDateTime } from "./sheltered-date.util";

describe("sheltered-date.util", () => {
  describe("toDateOnly", () => {
    it("returns null for null, undefined and blank input", () => {
      expect(toDateOnly(null)).toBeNull();
      expect(toDateOnly(undefined)).toBeNull();
      expect(toDateOnly("   ")).toBeNull();
    });

    it("keeps an already normalized calendar date untouched", () => {
      expect(toDateOnly("2015-04-02")).toBe("2015-04-02");
    });

    it("trims a full ISO timestamp down to the calendar date", () => {
      expect(toDateOnly("2015-04-02T23:15:00.000Z")).toBe("2015-04-02");
    });

    it("normalizes a Date instance", () => {
      expect(toDateOnly(new Date("2015-04-02T10:00:00.000Z"))).toBe(
        "2015-04-02",
      );
    });

    it("returns null for an unparseable string and an invalid Date", () => {
      expect(toDateOnly("not-a-date")).toBeNull();
      expect(toDateOnly(new Date("invalid"))).toBeNull();
    });
  });

  describe("toIsoDateTime", () => {
    it("serializes a Date instance", () => {
      expect(toIsoDateTime(new Date("2026-02-20T08:00:00.000Z"))).toBe(
        "2026-02-20T08:00:00.000Z",
      );
    });

    it("normalizes a parseable string", () => {
      expect(toIsoDateTime("2026-02-20")).toBe("2026-02-20T00:00:00.000Z");
    });

    it("falls back to the current instant when the value cannot be parsed", () => {
      jest.useFakeTimers().setSystemTime(new Date("2026-03-01T00:00:00.000Z"));
      expect(toIsoDateTime("nonsense")).toBe("2026-03-01T00:00:00.000Z");
      jest.useRealTimers();
    });
  });

  describe("isDateOnly", () => {
    it("accepts only the YYYY-MM-DD shape", () => {
      expect(isDateOnly("2015-04-02")).toBe(true);
      expect(isDateOnly("2015-04-02T00:00:00Z")).toBe(false);
      expect(isDateOnly("02/04/2015")).toBe(false);
    });
  });
});
