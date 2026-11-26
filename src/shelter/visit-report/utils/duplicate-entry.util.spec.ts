import { QueryFailedError } from "typeorm";

import { isDuplicateEntry } from "./duplicate-entry.util";

const queryError = (errno: number): QueryFailedError =>
  new QueryFailedError("INSERT", [], Object.assign(new Error("x"), { errno }));

describe("isDuplicateEntry", () => {
  it("reconhece a violação de chave única do MySQL (1062)", () => {
    expect(isDuplicateEntry(queryError(1062))).toBe(true);
  });

  it("não confunde outros erros do banco nem erros comuns", () => {
    expect(isDuplicateEntry(queryError(1264))).toBe(false);
    expect(isDuplicateEntry(new Error("x"))).toBe(false);
    expect(isDuplicateEntry(undefined)).toBe(false);
  });
});
