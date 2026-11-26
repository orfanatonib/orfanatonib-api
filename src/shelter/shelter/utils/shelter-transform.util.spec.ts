import { UploadType } from "src/shared/media/media-item/media-item.entity";
import { normalizeUploadType, toArrayOrEmpty } from "./shelter-transform.util";

describe("normalizeUploadType", () => {
  it.each([
    ["upload", UploadType.UPLOAD],
    ["UPLOAD", UploadType.UPLOAD],
    ["Link", UploadType.LINK],
  ])("maps %s to the enum value", (raw, expected) => {
    expect(normalizeUploadType(raw)).toBe(expected);
  });

  it("keeps an unknown string as it came, so @IsEnum reports it", () => {
    expect(normalizeUploadType("torrent")).toBe("torrent");
  });

  it("passes through values that are not strings", () => {
    expect(normalizeUploadType(undefined)).toBeUndefined();
    expect(normalizeUploadType(7)).toBe(7);
  });
});

describe("toArrayOrEmpty", () => {
  it("keeps a loaded relation", () => {
    const value = [{ id: "team-id" }];

    expect(toArrayOrEmpty(value)).toBe(value);
  });

  it.each([[undefined], [null], ["não é lista"]])(
    "falls back to an empty list for %p",
    (value) => {
      expect(toArrayOrEmpty(value)).toEqual([]);
    },
  );
});
