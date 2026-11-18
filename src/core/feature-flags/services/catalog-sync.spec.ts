import { Test } from "@nestjs/testing";

import { CreateFeatureFlagService } from "./create-feature-flag.service";
import { GetFeatureFlagsService } from "./get-feature-flags.service";
import { FeatureFlagsRepository } from "../feature-flags.repository";
import { FeatureFlagEntity } from "../entities/feature-flag.entity";
import {
  DEFAULT_FEATURE_FLAGS,
  RETIRED_FEATURE_FLAGS,
  isInternalFeatureFlag,
} from "../constants";

const buildFlag = (key: string): FeatureFlagEntity =>
  Object.assign(new FeatureFlagEntity(), {
    id: `id-${key}`,
    key,
    name: key,
    description: null,
    enabled: true,
    environment: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe("catálogo de feature flags", () => {
  const repository = {
    findByKey: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const getService = { invalidate: jest.fn(), invalidateAll: jest.fn() };

  let service: CreateFeatureFlagService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateFeatureFlagService,
        { provide: FeatureFlagsRepository, useValue: repository },
        { provide: GetFeatureFlagsService, useValue: getService },
      ],
    }).compile();
    moduleRef.useLogger(false);

    service = moduleRef.get(CreateFeatureFlagService);

    repository.findByKey.mockResolvedValue(null);
    repository.create.mockImplementation((data: Partial<FeatureFlagEntity>) =>
      Object.assign(new FeatureFlagEntity(), data),
    );
    repository.save.mockImplementation((flag: FeatureFlagEntity) =>
      Promise.resolve(flag),
    );
    repository.remove.mockResolvedValue(undefined);
  });

  describe("definições de fábrica", () => {
    it("o catálogo cobre as três flags de interface e as de e-mail", () => {
      const keys = DEFAULT_FEATURE_FLAGS.map((flag) => flag.key);

      expect(keys).toContain("shelter-address");
      expect(keys).toContain("shelter-management");
      expect(keys).toContain("shelter-pagelas");
      expect(keys.filter(isInternalFeatureFlag).length).toBeGreaterThanOrEqual(
        12,
      );
    });

    it("a flag legada de eventos foi aposentada, não redefinida", () => {
      expect(DEFAULT_FEATURE_FLAGS.map((flag) => flag.key)).not.toContain(
        "event-email-notifications",
      );
      expect(RETIRED_FEATURE_FLAGS).toContain("event-email-notifications");
    });

    it("toda flag operacional de e-mail nasce ligada", () => {
      const internals = DEFAULT_FEATURE_FLAGS.filter((flag) =>
        isInternalFeatureFlag(flag.key),
      );

      // Nascer desligada silenciaria a recuperação de senha num banco novo.
      expect(internals.every((flag) => flag.enabled)).toBe(true);
    });
  });

  describe("seedDefaults", () => {
    it("cria as que faltam e devolve só elas", async () => {
      const created = await service.seedDefaults();

      expect(created).toHaveLength(DEFAULT_FEATURE_FLAGS.length);
      expect(getService.invalidateAll).toHaveBeenCalledTimes(1);
    });

    it("não recria nem sobrescreve o que já existe", async () => {
      repository.findByKey.mockImplementation((key: string) =>
        Promise.resolve(buildFlag(key)),
      );

      await expect(service.seedDefaults()).resolves.toEqual([]);
      expect(repository.save).not.toHaveBeenCalled();
      // Sem criação, nada a invalidar.
      expect(getService.invalidateAll).not.toHaveBeenCalled();
    });

    it("chave duplicada numa flag (corrida entre instâncias) não impede as seguintes", async () => {
      repository.save.mockImplementationOnce(() =>
        Promise.reject(new Error("ER_DUP_ENTRY")),
      );

      const created = await service.seedDefaults();

      expect(created).toHaveLength(DEFAULT_FEATURE_FLAGS.length - 1);
      expect(repository.save).toHaveBeenCalledTimes(
        DEFAULT_FEATURE_FLAGS.length,
      );
    });

    it("preserva o estado escolhido pelo operador numa flag existente", async () => {
      const desligada = buildFlag("email-delivery");
      desligada.enabled = false;
      repository.findByKey.mockImplementation((key: string) =>
        Promise.resolve(key === "email-delivery" ? desligada : null),
      );

      await service.seedDefaults();

      const savedKeys = repository.save.mock.calls.map(
        ([flag]: [FeatureFlagEntity]) => flag.key,
      );
      expect(savedKeys).not.toContain("email-delivery");
      expect(desligada.enabled).toBe(false);
    });
  });

  describe("retireLegacyFlags", () => {
    it("remove as aposentadas que ainda existem", async () => {
      repository.findByKey.mockImplementation((key: string) =>
        Promise.resolve(
          RETIRED_FEATURE_FLAGS.includes(key) ? buildFlag(key) : null,
        ),
      );

      await expect(service.retireLegacyFlags()).resolves.toEqual([
        ...RETIRED_FEATURE_FLAGS,
      ]);
      expect(repository.remove).toHaveBeenCalledTimes(
        RETIRED_FEATURE_FLAGS.length,
      );
      expect(getService.invalidateAll).toHaveBeenCalled();
    });

    it("é idempotente quando elas já sumiram", async () => {
      repository.findByKey.mockResolvedValue(null);

      await expect(service.retireLegacyFlags()).resolves.toEqual([]);
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  describe("onModuleInit", () => {
    it("confere o catálogo ao subir a aplicação", async () => {
      await service.onModuleInit();

      expect(repository.findByKey).toHaveBeenCalled();
    });

    it("uma falha no banco não impede a aplicação de subir", async () => {
      repository.findByKey.mockRejectedValue(new Error("banco fora do ar"));

      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });
});
