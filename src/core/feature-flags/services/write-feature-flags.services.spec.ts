import { Test } from "@nestjs/testing";

import { ResourceConflictException } from "src/common/exceptions";
import { EmailTemplateKey } from "src/communication/notification/enums/email-template-key.enum";
import { UserRole } from "src/core/auth/auth.types";

import { DEFAULT_FEATURE_FLAGS } from "../constants";
import { FeatureFlagEntity } from "../entities/feature-flag.entity";
import { emailFeatureFlagKey } from "../enums/feature-flag-keys.enum";
import { FeatureFlagsRepository } from "../feature-flags.repository";
import { metadataWithTargetRoles } from "../utils";
import { CreateFeatureFlagService } from "./create-feature-flag.service";
import { DeleteFeatureFlagService } from "./delete-feature-flag.service";
import { GetFeatureFlagsService } from "./get-feature-flags.service";
import { UpdateFeatureFlagService } from "./update-feature-flag.service";

function buildFlag(key = "shelter_management"): FeatureFlagEntity {
  return Object.assign(new FeatureFlagEntity(), {
    id: "flag-id",
    key,
    name: "Gestão de acolhidos",
    description: "Descrição original",
    enabled: true,
    metadata: metadataWithTargetRoles({ rollout: 50 }, ["leader"]),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe("feature flag write services", () => {
  const repository = {
    findByKey: jest.fn(),
    create: jest.fn((data: Partial<FeatureFlagEntity>) =>
      Object.assign(buildFlag(String(data.key)), data),
    ),
    save: jest.fn((flag: FeatureFlagEntity) => Promise.resolve(flag)),
    remove: jest.fn(),
  };
  const getService = {
    findEntityOrFail: jest.fn(),
    invalidate: jest.fn(),
    invalidateAll: jest.fn(),
  };

  let createService: CreateFeatureFlagService;
  let updateService: UpdateFeatureFlagService;
  let deleteService: DeleteFeatureFlagService;

  beforeEach(async () => {
    jest.clearAllMocks();
    getService.findEntityOrFail.mockResolvedValue(buildFlag());

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateFeatureFlagService,
        UpdateFeatureFlagService,
        DeleteFeatureFlagService,
        { provide: FeatureFlagsRepository, useValue: repository },
        { provide: GetFeatureFlagsService, useValue: getService },
      ],
    }).compile();

    createService = moduleRef.get(CreateFeatureFlagService);
    updateService = moduleRef.get(UpdateFeatureFlagService);
    deleteService = moduleRef.get(DeleteFeatureFlagService);
  });

  it("seeds every email template flag so it can be managed", () => {
    const defaultKeys = new Set<string>(
      DEFAULT_FEATURE_FLAGS.map((definition) => definition.key),
    );

    for (const templateKey of Object.values(EmailTemplateKey)) {
      expect(defaultKeys.has(emailFeatureFlagKey(templateKey))).toBe(true);
    }
  });

  it("rejects duplicate keys on create", async () => {
    repository.findByKey.mockResolvedValue(buildFlag());

    await expect(
      createService.create({ key: "existing", name: "Existing" }),
    ).rejects.toBeInstanceOf(ResourceConflictException);
  });

  it("creates a flag with normalized audience metadata", async () => {
    repository.findByKey.mockResolvedValue(null);

    const created = await createService.create({
      key: "new-feature",
      name: "Nova função",
      targetRoles: [UserRole.MEMBER, UserRole.ADMIN],
      metadata: { rollout: 10 },
    });

    expect(created.targetRoles).toEqual(["admin", "member"]);
    expect(created.metadata).toEqual({ rollout: 10 });
  });

  it("updates only supplied fields and preserves audience metadata", async () => {
    const updated = await updateService.update("shelter_management", {
      name: "Novo nome",
    });

    expect(updated.name).toBe("Novo nome");
    expect(updated.description).toBe("Descrição original");
    expect(updated.targetRoles).toEqual(["leader"]);
  });

  it("clears public metadata without losing the selected audience", async () => {
    const updated = await updateService.update("shelter_management", {
      metadata: null,
    });

    expect(updated.metadata).toBeNull();
    expect(updated.targetRoles).toEqual(["leader"]);
  });

  it("toggles and deletes through the repository", async () => {
    await expect(
      updateService.toggle("shelter_management"),
    ).resolves.toMatchObject({
      enabled: false,
    });

    expect(repository.save).toHaveBeenCalled();
  });

  it("recusa remover ou renomear flag de fábrica (o boot a recriaria)", async () => {
    await expect(deleteService.remove("shelter_management")).rejects.toThrow(
      "não pode ser removida",
    );
    await expect(
      updateService.update("shelter_management", { key: "outro" }),
    ).rejects.toThrow("não pode ser renomeada");
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it("create invalida o cache da chave criada", async () => {
    repository.findByKey.mockResolvedValue(null);
    await createService.create({ key: "nova", name: "Nova" });
    expect(getService.invalidate).toHaveBeenCalledWith("nova");
  });

  it("create nasce desligada quando enabled não é informado", async () => {
    repository.findByKey.mockResolvedValue(null);
    const created = await createService.create({ key: "nova", name: "Nova" });
    expect(created.enabled).toBe(false);
  });

  it("update renomeia flag personalizada e invalida as duas chaves", async () => {
    getService.findEntityOrFail.mockResolvedValue(buildFlag("custom_flag"));
    repository.findByKey.mockResolvedValue(null);

    const updated = await updateService.update("custom_flag", {
      key: "custom_flag_2",
    });

    expect(updated.key).toBe("custom_flag_2");
    expect(getService.invalidate).toHaveBeenCalledWith("custom_flag");
    expect(getService.invalidate).toHaveBeenCalledWith("custom_flag_2");
  });

  it("update recusa renomear para uma chave já existente", async () => {
    getService.findEntityOrFail.mockResolvedValue(buildFlag("custom_flag"));
    repository.findByKey.mockResolvedValue(buildFlag("ocupada"));

    await expect(
      updateService.update("custom_flag", { key: "ocupada" }),
    ).rejects.toBeInstanceOf(ResourceConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("update troca o público sem perder o metadata público", async () => {
    const updated = await updateService.update("shelter_management", {
      targetRoles: [UserRole.ADMIN],
    });
    expect(updated.targetRoles).toEqual(["admin"]);
    expect(updated.metadata).toEqual({ rollout: 50 });
  });

  it("toggle religa uma flag desligada e invalida o cache", async () => {
    const off = buildFlag();
    off.enabled = false;
    getService.findEntityOrFail.mockResolvedValue(off);

    await expect(
      updateService.toggle("shelter_management"),
    ).resolves.toMatchObject({ enabled: true });
    expect(getService.invalidate).toHaveBeenCalledWith("shelter_management");
  });

  it("remove apaga flag personalizada e invalida o cache", async () => {
    const custom = buildFlag("custom_flag");
    getService.findEntityOrFail.mockResolvedValue(custom);

    await deleteService.remove("custom_flag");

    expect(repository.remove).toHaveBeenCalledWith(custom);
    expect(getService.invalidate).toHaveBeenCalledWith("custom_flag");
  });
});
