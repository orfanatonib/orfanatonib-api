import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { QueryContactDto } from "./query-contact.dto";

const parse = (payload: Record<string, unknown>) =>
  plainToInstance(QueryContactDto, payload);
const failing = (payload: Record<string, unknown>): string[] =>
  validateSync(parse(payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe("QueryContactDto", () => {
  it("aceita vazio e todos os filtros válidos", () => {
    expect(failing({})).toEqual([]);
    expect(
      failing({
        search: "maria",
        read: "false",
        createdFrom: "2026-01-01",
        createdTo: "2026-12-31",
        sortBy: "name",
        order: "ASC",
        page: "2",
        limit: "50",
      }),
    ).toEqual([]);
  });

  it("converte read=true|false para booleano", () => {
    expect(parse({ read: "true" }).read).toBe(true);
    expect(parse({ read: "false" }).read).toBe(false);
  });

  it.each([
    [{ read: "talvez" }, "read"],
    [{ sortBy: "email" }, "sortBy"],
    [{ createdFrom: "01-01-2026" }, "createdFrom"],
    [{ createdTo: "2026-13-01" }, "createdTo"],
    [{ page: "0" }, "page"],
    [{ limit: "101" }, "limit"],
    [{ order: "UP" }, "order"],
    [{ public: "true" }, "public"],
  ])("recusa %j", (payload, field) => {
    expect(failing(payload)).toContain(field);
  });
});
