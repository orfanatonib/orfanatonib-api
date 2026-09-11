import { Test } from "@nestjs/testing";

import { ResourceNotFoundException } from "src/common/exceptions";
import { UserRole } from "src/core/auth/auth.types";

import { FeatureFlagEntity } from "../entities/feature-flag.entity";
import { FeatureFlagsRepository } from "../feature-flags.repository";
import { metadataWithTargetRoles } from "../utils";
import { GetFeatureFlagsService } from "./get-feature-flags.service";

function buildFlag(
  key: string,
  targetRoles: readonly string[] = [],
  enabled = true,
): FeatureFlagEntity {
  return Object.assign(new FeatureFlagEntity(), {
    id: `id-${key}`,
    key,
    name: key,
    description: null,
    enabled,
    environment: null,
    metadata: metadataWithTargetRoles(null, targetRoles),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  });
}

describe("GetFeatureFlagsService", () => {
  const repository = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findAllFiltered: jest.fn(),
    findByKey: jest.fn(),
    findByEnvironment: jest.fn(),
    findEnabledState: jest.fn(),
  };

  let service: GetFeatureFlagsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GetFeatureFlagsService,
        { provide: FeatureFlagsRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(GetFeatureFlagsService);
  });

  it("returns the shared pagination envelope", async () => {
    repository.findAllPaginated.mockResolvedValue({
      items: [buildFlag("first")],
      total: 25,
    });

    await expect(
      service.findAllPaginated({ page: 2, limit: 12 }),
    ).resolves.toMatchObject({
      data: [{ key: "first" }],
      meta: { page: 2, limit: 12, totalItems: 25, totalPages: 3 },
    });
  });

  it("filters an audience after normalizing metadata roles", async () => {
    repository.findAllFiltered.mockResolvedValue([
      buildFlag("leader-member", ["member", "leader"]),
      buildFlag("admin", ["admin"]),
    ]);

    const result = await service.findAllPaginated({
      audience: "LEADER_MEMBER",
    });

    expect(result.data.map((flag) => flag.key)).toEqual(["leader-member"]);
    expect(result.meta.totalItems).toBe(1);
  });

  it("builds a map scoped to the requesting role", async () => {
    repository.findAll.mockResolvedValue([
      buildFlag("public"),
      buildFlag("leader-only", ["leader"]),
      buildFlag("disabled", [], false),
    ]);

    await expect(service.getFlagsMap(UserRole.MEMBER)).resolves.toEqual({
      public: true,
      "leader-only": false,
      disabled: false,
    });
  });

  it("uses the caller default only when a switch is absent", async () => {
    repository.findEnabledState
      .mockResolvedValueOnce(null)
      .mockResolvedValue(false);

    await expect(service.isEnabledOrDefault("missing", true)).resolves.toBe(
      true,
    );
    await expect(service.isEnabledOrDefault("stored", true)).resolves.toBe(
      false,
    );
  });

  it("throws the application not-found exception", async () => {
    repository.findByKey.mockResolvedValue(null);

    await expect(service.findOne("missing")).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});

describe("GetFeatureFlagsService — mapa público", () => {
  const repository = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findAllFiltered: jest.fn(),
    findByKey: jest.fn(),
    findByEnvironment: jest.fn(),
    findEnabledState: jest.fn(),
  };

  let service: GetFeatureFlagsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GetFeatureFlagsService,
        { provide: FeatureFlagsRepository, useValue: repository },
      ],
    }).compile();
    moduleRef.useLogger(false);
    service = moduleRef.get(GetFeatureFlagsService);

    repository.findAll.mockResolvedValue([
      buildFlag("shelter-management"),
      buildFlag("shelter-address"),
      buildFlag("email-delivery", [], false),
      buildFlag("email-password-reset"),
    ]);
  });

  it("não expõe as flags operacionais de e-mail", async () => {
    const map = await service.getFlagsMap(null);

    expect(Object.keys(map).sort()).toEqual([
      "shelter-address",
      "shelter-management",
    ]);
  });

  it("não revela que o envio de e-mail está desligado", async () => {
    const map = await service.getFlagsMap(UserRole.ADMIN);

    expect(map).not.toHaveProperty("email-delivery");
    expect(JSON.stringify(map)).not.toContain("email-");
  });

  it("devolve a decisão efetiva para o papel do ator", async () => {
    repository.findAll.mockResolvedValue([
      buildFlag("so-admin", [UserRole.ADMIN]),
      buildFlag("para-todos"),
    ]);

    await expect(service.getFlagsMap(UserRole.ADMIN)).resolves.toEqual({
      "so-admin": true,
      "para-todos": true,
    });
    service.invalidateAll();
    await expect(service.getFlagsMap(UserRole.MEMBER)).resolves.toEqual({
      "so-admin": false,
      "para-todos": true,
    });
  });

  it("memoriza o mapa: a rota é pública e roda a cada carga do app", async () => {
    await service.getFlagsMap(null);
    await service.getFlagsMap(null);

    expect(repository.findAll).toHaveBeenCalledTimes(1);
  });

  it("guarda um mapa por papel", async () => {
    await service.getFlagsMap(UserRole.ADMIN);
    await service.getFlagsMap(UserRole.MEMBER);

    expect(repository.findAll).toHaveBeenCalledTimes(2);
  });

  it("uma alteração de flag descarta o mapa memorizado", async () => {
    await service.getFlagsMap(null);
    service.invalidate("shelter-management");
    await service.getFlagsMap(null);

    expect(repository.findAll).toHaveBeenCalledTimes(2);
  });
});

describe("GetFeatureFlagsService — consultas administrativas", () => {
  const repository = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findAllFiltered: jest.fn(),
    findByKey: jest.fn(),
    findByEnvironment: jest.fn(),
    findEnabledState: jest.fn(),
  };

  let service: GetFeatureFlagsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GetFeatureFlagsService,
        { provide: FeatureFlagsRepository, useValue: repository },
      ],
    }).compile();
    moduleRef.useLogger(false);
    service = moduleRef.get(GetFeatureFlagsService);

    repository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });
    repository.findAllFiltered.mockResolvedValue([]);
    repository.findAll.mockResolvedValue([]);
    repository.findByEnvironment.mockResolvedValue([]);
  });

  it("findByEnvironment mapeia para o DTO de resposta", async () => {
    repository.findByEnvironment.mockResolvedValue([buildFlag("local-flag")]);

    const result = await service.findByEnvironment("local");

    expect(repository.findByEnvironment).toHaveBeenCalledWith("local");
    expect(result[0].key).toBe("local-flag");
  });

  it("findAllPaginated devolve o envelope compartilhado", async () => {
    repository.findAllPaginated.mockResolvedValue({
      items: [buildFlag("a"), buildFlag("b")],
      total: 30,
    });

    const result = await service.findAllPaginated({ page: 2, limit: 10 });

    expect(result.data).toHaveLength(2);
    expect(result.meta).toMatchObject({
      page: 2,
      limit: 10,
      totalItems: 30,
      totalPages: 3,
    });
  });

  it("com filtro de público, a paginação acontece em memória", async () => {
    repository.findAllFiltered.mockResolvedValue([
      buildFlag("so-admin", [UserRole.ADMIN]),
      buildFlag("todos"),
      buildFlag("outro-admin", [UserRole.ADMIN]),
    ]);

    const result = await service.findAllPaginated({
      audience: "ADMIN",
      page: 1,
      limit: 1,
    });

    expect(repository.findAllFiltered).toHaveBeenCalled();
    expect(result.meta.totalItems).toBe(2);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].key).toBe("so-admin");
  });

  it("getStats conta ligadas, desligadas e a distribuição por público", async () => {
    repository.findAll.mockResolvedValue([
      buildFlag("a", [], true),
      buildFlag("b", [], false),
      buildFlag("c", [UserRole.ADMIN], true),
    ]);

    const stats = await service.getStats();

    expect(stats).toMatchObject({ total: 3, enabled: 2, disabled: 1 });
    expect(stats.byAudience.EVERYONE).toBe(2);
    expect(stats.byAudience.ADMIN).toBe(1);
  });

  it("isEnabledForRole respeita o público e memoriza a resposta", async () => {
    repository.findByKey.mockResolvedValue(
      buildFlag("so-admin", [UserRole.ADMIN]),
    );

    await expect(
      service.isEnabledForRole("so-admin", UserRole.ADMIN),
    ).resolves.toBe(true);
    await expect(
      service.isEnabledForRole("so-admin", UserRole.MEMBER),
    ).resolves.toBe(false);

    await service.isEnabledForRole("so-admin", UserRole.ADMIN);
    // Duas chaves de cache distintas (uma por papel), sem terceira consulta.
    expect(repository.findByKey).toHaveBeenCalledTimes(2);
  });

  it("isEnabledForRole é falso para chave inexistente", async () => {
    repository.findByKey.mockResolvedValue(null);

    await expect(service.isEnabledForRole("nao-existe", null)).resolves.toBe(
      false,
    );
  });
});
