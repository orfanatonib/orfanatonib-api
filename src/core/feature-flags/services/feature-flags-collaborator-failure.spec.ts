import { Test } from "@nestjs/testing";

import { FeatureFlagEntity } from "../entities/feature-flag.entity";
import { FeatureFlagsRepository } from "../feature-flags.repository";
import { metadataWithTargetRoles } from "../utils";
import { CreateFeatureFlagService } from "./create-feature-flag.service";
import { DeleteFeatureFlagService } from "./delete-feature-flag.service";
import { GetFeatureFlagsService } from "./get-feature-flags.service";
import { UpdateFeatureFlagService } from "./update-feature-flag.service";

/**
 * Falha do colaborador (repositório/banco): o erro chega ao chamador e NADA
 * parcial acontece — em especial, o cache NÃO é invalidado como se a escrita
 * tivesse dado certo (senão o próximo leitor veria um estado que não existe).
 */
function flag(key = "custom_flag"): FeatureFlagEntity {
  return Object.assign(new FeatureFlagEntity(), {
    id: "id-1",
    key,
    name: "Personalizada",
    description: null,
    enabled: true,
    isProtected: false,
    version: 1,
    metadata: metadataWithTargetRoles(null, []),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe("flags: falha do colaborador sem efeito parcial", () => {
  const boom = new Error("banco indisponível");
  const repository = {
    findByKey: jest.fn(),
    create: jest.fn((data: Partial<FeatureFlagEntity>) =>
      Object.assign(flag(String(data.key)), data),
    ),
    save: jest.fn(),
    remove: jest.fn(),
    markProtected: jest.fn(),
    setEnabledIfVersion: jest.fn(),
  };
  const getService = {
    findEntityOrFail: jest.fn(),
    findOne: jest.fn(),
    invalidate: jest.fn(),
    invalidateAll: jest.fn(),
  };

  let create: CreateFeatureFlagService;
  let update: UpdateFeatureFlagService;
  let remove: DeleteFeatureFlagService;

  beforeEach(async () => {
    jest.clearAllMocks();
    getService.findEntityOrFail.mockResolvedValue(flag());
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
    create = moduleRef.get(CreateFeatureFlagService);
    update = moduleRef.get(UpdateFeatureFlagService);
    remove = moduleRef.get(DeleteFeatureFlagService);
  });

  it("[feature-flags.delete.feature-flags-key#falha-do-colaborador-sem-efeito-parcial] remove falha: erro propagado e cache intacto", async () => {
    repository.remove.mockRejectedValue(boom);
    await expect(remove.remove("custom_flag")).rejects.toBe(boom);
    expect(getService.invalidate).not.toHaveBeenCalled();
  });

  it("[feature-flags.patch.feature-flags-key#falha-do-colaborador-sem-efeito-parcial] update falha ao salvar: erro propagado e cache intacto", async () => {
    repository.save.mockRejectedValue(boom);
    await expect(update.update("custom_flag", { name: "x" })).rejects.toBe(
      boom,
    );
    expect(getService.invalidate).not.toHaveBeenCalled();
  });

  it("[feature-flags.patch.feature-flags-key-toggle#falha-do-colaborador-sem-efeito-parcial] toggle falha ao salvar: erro propagado e cache intacto", async () => {
    repository.save.mockRejectedValue(boom);
    await expect(update.toggle("custom_flag")).rejects.toBe(boom);
    expect(getService.invalidate).not.toHaveBeenCalled();
  });

  it("[feature-flags.post.feature-flags#falha-do-colaborador-sem-efeito-parcial] create falha ao salvar: erro propagado e cache intacto", async () => {
    repository.findByKey.mockResolvedValue(null);
    repository.save.mockRejectedValue(boom);
    await expect(create.create({ key: "nova", name: "Nova" })).rejects.toBe(
      boom,
    );
    expect(getService.invalidate).not.toHaveBeenCalled();
  });

  it("[feature-flags.post.feature-flags-seed#falha-do-colaborador-sem-efeito-parcial] seed: uma flag que falha não impede as demais e não derruba a conferência", async () => {
    repository.findByKey.mockResolvedValue(null);
    repository.markProtected.mockResolvedValue(0);
    repository.save
      .mockRejectedValueOnce(boom)
      .mockImplementation((entity: FeatureFlagEntity) =>
        Promise.resolve(entity),
      );

    const result = await create.synchronizeCatalog();

    expect(result.created.length).toBeGreaterThan(0);
    expect(repository.save.mock.calls.length).toBeGreaterThan(1);
  });
});
