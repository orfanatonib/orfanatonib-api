import { Test } from "@nestjs/testing";

import { CreateFeatureFlagService } from "./create-feature-flag.service";
import { GetFeatureFlagsService } from "./get-feature-flags.service";
import { FeatureFlagsRepository } from "../feature-flags.repository";
import { FeatureFlagEntity } from "../entities/feature-flag.entity";
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_RENAMES,
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
    it("o catálogo tem as 53 flags de interface em snake_case e as 12 de e-mail", () => {
      const keys = DEFAULT_FEATURE_FLAGS.map((flag) => flag.key);
      const ui = keys.filter((key) => !isInternalFeatureFlag(key));

      expect(ui).toHaveLength(53);
      expect(ui.every((key) => /^[a-z]+(_[a-z]+)*$/.test(key))).toBe(true);
      expect(keys.filter(isInternalFeatureFlag)).toHaveLength(12);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it("toda flag restrita inclui admin explicitamente", () => {
      for (const flag of DEFAULT_FEATURE_FLAGS) {
        if (flag.targetRoles.length > 0) {
          expect(flag.targetRoles as readonly string[]).toContain("admin");
        }
      }
    });

    it("estúdio, Dia da Família e auditoria nascem desligados; o resto ligado", () => {
      const off = DEFAULT_FEATURE_FLAGS.filter((flag) => !flag.enabled).map(
        (flag) => flag.key,
      );
      expect(off.sort()).toEqual(
        [
          "content_studio",
          "content_studio_generation",
          "content_studio_provider_admin",
          "content_studio_publication",
          "content_studio_review",
          "observability_audit",
        ].sort(),
      );
    });

    it("toda chave nova de FEATURE_FLAG_RENAMES existe no catálogo", () => {
      const keys = DEFAULT_FEATURE_FLAGS.map((flag) => flag.key) as string[];
      for (const rename of FEATURE_FLAG_RENAMES) {
        for (const target of rename.to) expect(keys).toContain(target);
      }
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
      const desligada = buildFlag("email_delivery");
      desligada.enabled = false;
      repository.findByKey.mockImplementation((key: string) =>
        Promise.resolve(key === "email_delivery" ? desligada : null),
      );

      await service.seedDefaults();

      const savedKeys = repository.save.mock.calls.map(
        ([flag]: [FeatureFlagEntity]) => flag.key,
      );
      expect(savedKeys).not.toContain("email_delivery");
      expect(desligada.enabled).toBe(false);
    });
  });

  describe("copyRenamedFlags", () => {
    const saved = () =>
      repository.save.mock.calls.map(([flag]: [FeatureFlagEntity]) => flag);

    it("a chave nova copia enabled e targetRoles da antiga", async () => {
      const antiga = buildFlag("shelter-management");
      antiga.enabled = false;
      antiga.metadata = { targetRoles: ["admin"] };
      repository.findByKey.mockImplementation((key: string) =>
        Promise.resolve(key === "shelter-management" ? antiga : null),
      );

      const copied = await service.copyRenamedFlags();

      expect(copied).toEqual(["sheltered_management"]);
      const nova = saved()[0];
      expect(nova.enabled).toBe(false);
      expect(nova.metadata).toEqual({ targetRoles: ["admin"] });
      expect(getService.invalidateAll).toHaveBeenCalled();
    });

    it("shelter-pagelas desligada gera DUAS chaves desligadas (nada nasce ligado por acidente)", async () => {
      const antiga = buildFlag("shelter-pagelas");
      antiga.enabled = false;
      repository.findByKey.mockImplementation((key: string) =>
        Promise.resolve(key === "shelter-pagelas" ? antiga : null),
      );

      const copied = await service.copyRenamedFlags();

      expect(copied.sort()).toEqual(["pagelas", "sheltered_area"]);
      expect(saved().every((flag) => flag.enabled === false)).toBe(true);
    });

    it("é idempotente: chave nova já existente não é tocada", async () => {
      repository.findByKey.mockImplementation((key: string) =>
        Promise.resolve(buildFlag(key)),
      );

      await expect(service.copyRenamedFlags()).resolves.toEqual([]);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it("sem a chave antiga não cria nada (instalação nova usa o seed)", async () => {
      repository.findByKey.mockResolvedValue(null);
      await expect(service.copyRenamedFlags()).resolves.toEqual([]);
    });

    it("erro numa cópia não impede as demais", async () => {
      const a = buildFlag("shelter-address");
      const b = buildFlag("shelter-management");
      repository.findByKey.mockImplementation((key: string) =>
        Promise.resolve(
          key === "shelter-address"
            ? a
            : key === "shelter-management"
              ? b
              : null,
        ),
      );
      repository.save.mockImplementationOnce(() =>
        Promise.reject(new Error("ER_DUP_ENTRY")),
      );

      await expect(service.copyRenamedFlags()).resolves.toEqual([
        "sheltered_management",
      ]);
    });

    it("a antiga é mantida na versão N (não entra em RETIRED)", () => {
      for (const rename of FEATURE_FLAG_RENAMES) {
        expect(RETIRED_FEATURE_FLAGS).not.toContain(rename.from);
      }
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
