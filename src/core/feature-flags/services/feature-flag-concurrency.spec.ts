import { Test } from "@nestjs/testing";

import { ResourceConflictException } from "src/common/exceptions";

import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_PROTECTED_CODE,
  FEATURE_FLAG_VERSION_CONFLICT_CODE,
} from "../constants";
import { FeatureFlagEntity } from "../entities/feature-flag.entity";
import { FeatureFlagsRepository } from "../feature-flags.repository";
import { metadataWithTargetRoles } from "../utils";
import { CreateFeatureFlagService } from "./create-feature-flag.service";
import { DeleteFeatureFlagService } from "./delete-feature-flag.service";
import { GetFeatureFlagsService } from "./get-feature-flags.service";
import { UpdateFeatureFlagService } from "./update-feature-flag.service";

function buildFlag(
  overrides: Partial<FeatureFlagEntity> = {},
): FeatureFlagEntity {
  return Object.assign(new FeatureFlagEntity(), {
    id: "flag-id",
    key: "custom_flag",
    name: "Personalizada",
    description: null,
    enabled: true,
    isProtected: false,
    version: 3,
    metadata: metadataWithTargetRoles(null, []),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

async function conflictDetails(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(ResourceConflictException);
    expect((error as ResourceConflictException).getStatus()).toBe(409);
    return (error as ResourceConflictException).getResponse();
  }
  throw new Error("esperava ResourceConflictException");
}

describe("flags: idempotência, versão otimista e proteção", () => {
  const repository = {
    findByKey: jest.fn(),
    save: jest.fn((flag: FeatureFlagEntity) => Promise.resolve(flag)),
    remove: jest.fn(),
    setEnabledIfVersion: jest.fn(),
    markProtected: jest.fn(),
    create: jest.fn((data: Partial<FeatureFlagEntity>) =>
      Object.assign(new FeatureFlagEntity(), data),
    ),
  };
  const getService = {
    findEntityOrFail: jest.fn(),
    findOne: jest.fn(),
    invalidate: jest.fn(),
    invalidateAll: jest.fn(),
  };

  let update: UpdateFeatureFlagService;
  let remove: DeleteFeatureFlagService;
  let create: CreateFeatureFlagService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateFeatureFlagService,
        UpdateFeatureFlagService,
        DeleteFeatureFlagService,
        { provide: FeatureFlagsRepository, useValue: repository },
        { provide: GetFeatureFlagsService, useValue: getService },
      ],
    }).compile();
    moduleRef.useLogger(false);
    update = moduleRef.get(UpdateFeatureFlagService);
    remove = moduleRef.get(DeleteFeatureFlagService);
    create = moduleRef.get(CreateFeatureFlagService);
  });

  describe("PUT :key/enabled (setEnabled)", () => {
    it("repetir o mesmo estado não grava nem invalida (idempotente)", async () => {
      getService.findEntityOrFail.mockResolvedValue(buildFlag());

      const first = await update.setEnabled("custom_flag", { enabled: true });
      const second = await update.setEnabled("custom_flag", { enabled: true });

      expect(first).toEqual(second);
      expect(first.enabled).toBe(true);
      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.setEnabledIfVersion).not.toHaveBeenCalled();
      expect(getService.invalidate).not.toHaveBeenCalled();
    });

    it("grava o estado desejado sem versão esperada e invalida o cache", async () => {
      getService.findEntityOrFail.mockResolvedValue(buildFlag());
      getService.findOne.mockResolvedValue({ key: "custom_flag" });

      await update.setEnabled("custom_flag", { enabled: false });

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
      expect(getService.invalidate).toHaveBeenCalledWith("custom_flag");
    });

    it("com expectedVersion usa a escrita atômica condicional", async () => {
      getService.findEntityOrFail.mockResolvedValue(buildFlag());
      getService.findOne.mockResolvedValue({ key: "custom_flag" });
      repository.setEnabledIfVersion.mockResolvedValue(true);

      await update.setEnabled("custom_flag", {
        enabled: false,
        expectedVersion: 3,
      });

      expect(repository.setEnabledIfVersion).toHaveBeenCalledWith(
        "flag-id",
        false,
        3,
      );
      expect(repository.save).not.toHaveBeenCalled();
      expect(getService.invalidate).toHaveBeenCalledWith("custom_flag");
    });

    it("versão desatualizada vira 409 FEATURE_FLAG_VERSION_CONFLICT e não invalida", async () => {
      getService.findEntityOrFail.mockResolvedValue(buildFlag());
      repository.setEnabledIfVersion.mockResolvedValue(false);

      const body = await conflictDetails(
        update.setEnabled("custom_flag", {
          enabled: false,
          expectedVersion: 2,
        }),
      );

      expect(body).toMatchObject({
        details: {
          code: FEATURE_FLAG_VERSION_CONFLICT_CODE,
          expectedVersion: 2,
          currentVersion: 3,
        },
      });
      expect(getService.invalidate).not.toHaveBeenCalled();
    });

    it("flag inexistente propaga o erro do serviço de leitura", async () => {
      getService.findEntityOrFail.mockRejectedValue(
        new Error("não encontrada"),
      );
      await expect(
        update.setEnabled("nada", { enabled: true }),
      ).rejects.toThrow("não encontrada");
    });
  });

  describe("PATCH :key com expectedVersion", () => {
    it("versão diferente da gravada: 409 e nada é salvo", async () => {
      getService.findEntityOrFail.mockResolvedValue(buildFlag());

      const body = await conflictDetails(
        update.update("custom_flag", { name: "Outro", expectedVersion: 1 }),
      );

      expect(body).toMatchObject({
        details: { code: FEATURE_FLAG_VERSION_CONFLICT_CODE },
      });
      expect(repository.save).not.toHaveBeenCalled();
    });

    it("versão igual: grava normalmente", async () => {
      getService.findEntityOrFail.mockResolvedValue(buildFlag());
      const saved = await update.update("custom_flag", {
        name: "Outro",
        expectedVersion: 3,
      });
      expect(saved.name).toBe("Outro");
      expect(saved.version).toBe(3);
    });
  });

  it("PATCH com name/enabled/key nulos: 400 (RuleException), não 500", async () => {
    getService.findEntityOrFail.mockResolvedValue(buildFlag());
    for (const field of ["name", "enabled", "key"]) {
      await expect(
        update.update("custom_flag", {
          [field]: null,
        } as unknown as Parameters<typeof update.update>[1]),
      ).rejects.toThrow("não pode ser nulo");
    }
    expect(repository.save).not.toHaveBeenCalled();
  });

  describe("flag protegida (409 FEATURE_FLAG_PROTECTED)", () => {
    it("coluna protected impede remover", async () => {
      getService.findEntityOrFail.mockResolvedValue(
        buildFlag({ isProtected: true }),
      );
      const body = await conflictDetails(remove.remove("custom_flag"));
      expect(body).toMatchObject({
        details: { code: FEATURE_FLAG_PROTECTED_CODE },
      });
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it("coluna protected impede renomear", async () => {
      getService.findEntityOrFail.mockResolvedValue(
        buildFlag({ isProtected: true }),
      );
      repository.findByKey.mockResolvedValue(null);
      const body = await conflictDetails(
        update.update("custom_flag", { key: "novo_nome" }),
      );
      expect(body).toMatchObject({
        details: { code: FEATURE_FLAG_PROTECTED_CODE },
      });
      expect(repository.save).not.toHaveBeenCalled();
    });

    it("linha antiga (sem a coluna) mas do catálogo continua protegida", async () => {
      getService.findEntityOrFail.mockResolvedValue(
        buildFlag({ key: DEFAULT_FEATURE_FLAGS[0].key, isProtected: false }),
      );
      await expect(
        remove.remove(DEFAULT_FEATURE_FLAGS[0].key),
      ).rejects.toBeInstanceOf(ResourceConflictException);
    });

    it("flag personalizada continua removível", async () => {
      const custom = buildFlag();
      getService.findEntityOrFail.mockResolvedValue(custom);
      await remove.remove("custom_flag");
      expect(repository.remove).toHaveBeenCalledWith(custom);
    });

    it("create nasce não protegida; a semeadura nasce protegida e o boot preenche as antigas", async () => {
      repository.findByKey.mockResolvedValue(null);
      repository.markProtected.mockResolvedValue(4);

      await create.create({ key: "nova", name: "Nova" });
      expect(repository.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ isProtected: false }),
      );

      await create.seedDefaults();
      expect(repository.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ isProtected: true }),
      );

      await expect(create.backfillProtected()).resolves.toBe(4);
      expect(repository.markProtected).toHaveBeenCalledWith(
        DEFAULT_FEATURE_FLAGS.map((d) => d.key),
      );
    });

    it("falha no preenchimento é registrada e não derruba o boot", async () => {
      repository.markProtected.mockRejectedValue(new Error("banco fora"));
      await expect(create.backfillProtected()).resolves.toBe(0);
    });
  });
});
