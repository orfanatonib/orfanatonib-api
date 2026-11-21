import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { CreateFeatureFlagDto } from "./create-feature-flag.dto";
import { QueryFeatureFlagsDto } from "./query-feature-flags.dto";
import { SetFeatureFlagEnabledDto } from "./set-feature-flag-enabled.dto";
import { UpdateFeatureFlagDto } from "./update-feature-flag.dto";
import { FEATURE_FLAGS_MAX_LIMIT } from "../constants";

const check = <TDto extends object>(
  dtoClass: new () => TDto,
  payload: Record<string, unknown>,
): { dto: TDto; fields: string[] } => {
  const dto = plainToInstance(dtoClass, payload, {
    enableImplicitConversion: false,
  });
  return { dto, fields: validateSync(dto).map((error) => error.property) };
};

describe("QueryFeatureFlagsDto", () => {
  it("converte página e limite vindos da query string", () => {
    const { dto, fields } = check(QueryFeatureFlagsDto, {
      page: "2",
      limit: "30",
    });

    expect(fields).toEqual([]);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(30);
  });

  it.each([
    ["true", true],
    ["false", false],
    [true, true],
    [false, false],
  ])("entende enabled=%p como %p", (raw, expected) => {
    const { dto, fields } = check(QueryFeatureFlagsDto, { enabled: raw });

    expect(fields).toEqual([]);
    expect(dto.enabled).toBe(expected);
  });

  it("recusa página zero e limite acima do teto", () => {
    expect(check(QueryFeatureFlagsDto, { page: "0" }).fields).toEqual(["page"]);
    expect(
      check(QueryFeatureFlagsDto, {
        limit: String(FEATURE_FLAGS_MAX_LIMIT + 1),
      }).fields,
    ).toEqual(["limit"]);
  });

  it("aceita a consulta vazia, com os padrões", () => {
    const { dto, fields } = check(QueryFeatureFlagsDto, {});

    expect(fields).toEqual([]);
    expect(dto.page).toBeGreaterThan(0);
    expect(dto.limit).toBeGreaterThan(0);
  });

  it("recusa um campo de ordenação desconhecido", () => {
    expect(check(QueryFeatureFlagsDto, { sort: "inexistente" }).fields).toEqual(
      ["sort"],
    );
  });
});

describe("CreateFeatureFlagDto", () => {
  const valid = { key: "nova-flag", name: "Nova Flag" };

  it("aceita chave minúscula com número, hífen e sublinhado", () => {
    for (const key of ["nova-flag", "nova_flag", "flag2", "a-b_c1"]) {
      expect(check(CreateFeatureFlagDto, { ...valid, key }).fields).toEqual([]);
    }
  });

  it("normaliza a chave em vez de recusar maiúscula e espaço nas pontas", () => {
    const { dto, fields } = check(CreateFeatureFlagDto, {
      ...valid,
      key: "  Nova-FLAG  ",
    });

    expect(fields).toEqual([]);
    expect(dto.key).toBe("nova-flag");
  });

  it("recusa chave com espaço no meio ou começando por símbolo", () => {
    expect(
      check(CreateFeatureFlagDto, { ...valid, key: "nova flag" }).fields,
    ).toEqual(["key"]);
    expect(
      check(CreateFeatureFlagDto, { ...valid, key: "-nova" }).fields,
    ).toEqual(["key"]);
  });

  it("exige chave e nome", () => {
    expect(check(CreateFeatureFlagDto, {}).fields.sort()).toEqual([
      "key",
      "name",
    ]);
  });

  it("aceita públicos válidos e recusa papel inventado", () => {
    expect(
      check(CreateFeatureFlagDto, {
        ...valid,
        targetRoles: ["admin", "leader"],
      }).fields,
    ).toEqual([]);
    expect(
      check(CreateFeatureFlagDto, { ...valid, targetRoles: ["auditor"] })
        .fields,
    ).toEqual(["targetRoles"]);
  });
});

describe("UpdateFeatureFlagDto", () => {
  it("aceita o corpo vazio: todo campo é opcional", () => {
    expect(check(UpdateFeatureFlagDto, {}).fields).toEqual([]);
  });

  it("valida os campos que vierem, herdando as regras da criação", () => {
    expect(
      check(UpdateFeatureFlagDto, { key: "chave invalida" }).fields,
    ).toEqual(["key"]);
    expect(check(UpdateFeatureFlagDto, { key: "MAIUSCULA" }).dto.key).toBe(
      "maiuscula",
    );
  });
});

describe("SetFeatureFlagEnabledDto", () => {
  it("exige enabled booleano", () => {
    expect(check(SetFeatureFlagEnabledDto, {}).fields).toContain("enabled");
    expect(
      check(SetFeatureFlagEnabledDto, { enabled: "true" }).fields,
    ).toContain("enabled");
    expect(check(SetFeatureFlagEnabledDto, { enabled: true }).fields).toEqual(
      [],
    );
  });

  it.each([0, -1, 1.5, "2"])("recusa expectedVersion inválida %p", (value) => {
    expect(
      check(SetFeatureFlagEnabledDto, { enabled: true, expectedVersion: value })
        .fields,
    ).toContain("expectedVersion");
  });

  it("aceita expectedVersion inteira positiva (também no PATCH)", () => {
    expect(
      check(SetFeatureFlagEnabledDto, { enabled: false, expectedVersion: 3 })
        .fields,
    ).toEqual([]);
    expect(
      check(UpdateFeatureFlagDto, { name: "x", expectedVersion: 3 }).fields,
    ).toEqual([]);
    expect(
      check(UpdateFeatureFlagDto, { expectedVersion: 0 }).fields,
    ).toContain("expectedVersion");
  });
});
