import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { QueryProfilesDto } from "./query-profiles.dto";

const parse = (payload: Record<string, unknown>) =>
  plainToInstance(QueryProfilesDto, payload);
const failing = (payload: Record<string, unknown>): string[] =>
  validateSync(parse(payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe("QueryProfilesDto", () => {
  it("aceita vazio e todos os filtros válidos", () => {
    expect(failing({})).toEqual([]);
    expect(
      failing({
        q: "ana",
        search: "ana",
        role: "leader",
        gender: "Feminino",
        birthMonth: "12",
        temperaments: "sanguíneo",
        loveLanguages: "toque",
        favoriteColor: "azul",
        createdFrom: "2026-01-01",
        createdTo: "2026-12-31",
        sortBy: "birthDate",
        order: "DESC",
        page: "2",
        limit: "12",
      }),
    ).toEqual([]);
  });

  it("converte o mês de aniversário para número", () => {
    expect(parse({ birthMonth: "6" }).birthMonth).toBe(6);
  });

  it.each([
    [{ search: "x".repeat(121) }, "search"],
    [{ birthMonth: "0" }, "birthMonth"],
    [{ birthMonth: "13" }, "birthMonth"],
    [{ createdFrom: "ontem" }, "createdFrom"],
    [{ createdTo: "2026-02-30" }, "createdTo"],
    [{ role: "visitor" }, "role"],
    [{ sortBy: "phone" }, "sortBy"],
    [{ order: "UP" }, "order"],
    [{ page: "0" }, "page"],
  ])("recusa %j", (payload, field) => {
    expect(failing(payload)).toContain(field);
  });
});
