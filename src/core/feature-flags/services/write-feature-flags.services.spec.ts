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

function buildFlag(key = "shelter-management"): FeatureFlagEntity {
  return Object.assign(new FeatureFlagEntity(), {
    id: "flag-id",
    key,
    name: "Gestão de acolhidos",
    description: "Descrição original",
    enabled: true,
    environment: null,
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
    const updated = await updateService.update("shelter-management", {
      name: "Novo nome",
    });

    expect(updated.name).toBe("Novo nome");
    expect(updated.description).toBe("Descrição original");
    expect(updated.targetRoles).toEqual(["leader"]);
  });

  it("clears public metadata without losing the selected audience", async () => {
    const updated = await updateService.update("shelter-management", {
      metadata: null,
    });

    expect(updated.metadata).toBeNull();
    expect(updated.targetRoles).toEqual(["leader"]);
  });

  it("toggles and deletes through the repository", async () => {
    await expect(
      updateService.toggle("shelter-management"),
    ).resolves.toMatchObject({
      enabled: false,
    });
    await deleteService.remove("shelter-management");

    expect(repository.save).toHaveBeenCalled();
    expect(repository.remove).toHaveBeenCalled();
    expect(getService.invalidate).toHaveBeenCalledWith("shelter-management");
  });
});
