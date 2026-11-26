import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import {
  ShelterTeamsQueryDto,
  usesShelterTeamsFeatures,
} from "./shelter-teams-query.dto";

const failing = (payload: Record<string, unknown>): string[] =>
  validateSync(plainToInstance(ShelterTeamsQueryDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe("ShelterTeamsQueryDto", () => {
  it("aceita vazio e todos os filtros válidos", () => {
    expect(failing({})).toEqual([]);
    expect(
      failing({
        search: "equipe 2",
        shelterId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
        sortBy: "teamCount",
        order: "DESC",
        page: "1",
        limit: "12",
      }),
    ).toEqual([]);
  });

  it.each([
    [{ shelterId: "x" }, "shelterId"],
    [{ sortBy: "memberCount" }, "sortBy"],
    [{ createdFrom: "2026-01-01" }, "createdFrom"],
    [{ page: "0" }, "page"],
    [{ limit: "101" }, "limit"],
  ])("recusa %j", (payload, field) => {
    expect(failing(payload)).toContain(field);
  });

  it("sem parâmetros continua na resposta legada", () => {
    expect(usesShelterTeamsFeatures(undefined)).toBe(false);
    expect(usesShelterTeamsFeatures({})).toBe(false);
    expect(usesShelterTeamsFeatures({ search: "a" })).toBe(true);
  });
});
