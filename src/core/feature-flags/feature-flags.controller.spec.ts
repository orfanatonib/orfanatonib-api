import { Test } from "@nestjs/testing";
import { Request } from "express";

import { UserRole } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "../auth/guards/role-guard";
import { AuthContextService } from "../auth/services/auth-context.service";
import { CreateFeatureFlagDto } from "./dto/create-feature-flag.dto";
import { QueryFeatureFlagsDto } from "./dto/query-feature-flags.dto";
import { UpdateFeatureFlagDto } from "./dto/update-feature-flag.dto";
import { FeatureFlagsController } from "./feature-flags.controller";
import { CreateFeatureFlagService } from "./services/create-feature-flag.service";
import { DeleteFeatureFlagService } from "./services/delete-feature-flag.service";
import { GetFeatureFlagsService } from "./services/get-feature-flags.service";
import { UpdateFeatureFlagService } from "./services/update-feature-flag.service";

const readGuards = (target: object): unknown[] => {
  const metadata: unknown = Reflect.getMetadata("__guards__", target);
  return Array.isArray(metadata) ? metadata : [];
};

const readMethodGuards = (method: keyof FeatureFlagsController): unknown[] =>
  readGuards(FeatureFlagsController.prototype[method] as object);

describe("FeatureFlagsController", () => {
  const createService = {
    create: jest.fn(),
    synchronizeCatalog: jest.fn(),
  };
  const getService = {
    findAllPaginated: jest.fn(),
    getStats: jest.fn(),
    getFlagsMap: jest.fn(),
    isEnabledForRole: jest.fn(),
    findOne: jest.fn(),
  };
  const updateService = {
    update: jest.fn(),
    toggle: jest.fn(),
    setEnabled: jest.fn(),
  };
  const deleteService = { remove: jest.fn() };
  const authContext = { getRole: jest.fn() };

  const request = { headers: {} } as Request;
  const flag = {
    id: "flag-id",
    key: "shelter-management",
    name: "Gestão de abrigos",
    description: null,
    enabled: true,
    targetRoles: [UserRole.ADMIN],
    audience: "ADMIN" as const,
    metadata: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  let controller: FeatureFlagsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [FeatureFlagsController],
      providers: [
        { provide: CreateFeatureFlagService, useValue: createService },
        { provide: GetFeatureFlagsService, useValue: getService },
        { provide: UpdateFeatureFlagService, useValue: updateService },
        { provide: DeleteFeatureFlagService, useValue: deleteService },
        { provide: AuthContextService, useValue: authContext },
      ],
    }).compile();
    moduleRef.useLogger(false);
    controller = moduleRef.get(FeatureFlagsController);
  });

  it.each([
    "create",
    "seed",
    "findAll",
    "stats",
    "findOne",
    "update",
    "toggle",
    "setEnabled",
    "remove",
  ] as const)("protects %s with JWT and administrator guards", (method) => {
    const guards = readMethodGuards(method);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(AdminRoleGuard);
  });

  it.each(["getFlagsMap", "check"] as const)(
    "keeps %s public so anonymous clients can read evaluated flags",
    (method) => {
      const guards = readMethodGuards(method);
      expect(guards).not.toContain(JwtAuthGuard);
      expect(guards).not.toContain(AdminRoleGuard);
    },
  );

  it("delegates PUT :key/enabled with the desired state and version", async () => {
    updateService.setEnabled.mockResolvedValue({ ...flag, enabled: false });
    const dto = { enabled: false, expectedVersion: 4 };

    await expect(
      controller.setEnabled("shelter-management", dto),
    ).resolves.toMatchObject({
      enabled: false,
    });
    expect(updateService.setEnabled).toHaveBeenCalledWith(
      "shelter-management",
      dto,
    );
  });

  it("delegates the paginated administration listing", async () => {
    const query: QueryFeatureFlagsDto = { page: 2, limit: 10 };
    const response = {
      data: [flag],
      meta: {
        page: 2,
        limit: 10,
        totalItems: 11,
        totalPages: 2,
        orderBy: "name",
        order: "ASC",
      },
    };
    getService.findAllPaginated.mockResolvedValue(response);

    await expect(controller.findAll(query)).resolves.toBe(response);
    expect(getService.findAllPaginated).toHaveBeenCalledWith(query);
  });

  it("evaluates the public map using the optional authenticated role", async () => {
    authContext.getRole.mockResolvedValue(UserRole.LEADER);
    getService.getFlagsMap.mockResolvedValue({ "shelter-management": false });

    await expect(controller.getFlagsMap(request)).resolves.toEqual({
      "shelter-management": false,
    });
    expect(authContext.getRole).toHaveBeenCalledWith(request);
    expect(getService.getFlagsMap).toHaveBeenCalledWith(UserRole.LEADER);
  });

  it("evaluates a single public flag using the optional role", async () => {
    authContext.getRole.mockResolvedValue(null);
    getService.isEnabledForRole.mockResolvedValue(false);

    await expect(
      controller.check("shelter-management", request),
    ).resolves.toEqual({ key: "shelter-management", enabled: false });
    expect(getService.isEnabledForRole).toHaveBeenCalledWith(
      "shelter-management",
      null,
    );
  });

  it("delegates create, update, toggle and delete commands", async () => {
    const createDto = {
      key: flag.key,
      name: flag.name,
      targetRoles: [UserRole.ADMIN],
    } as CreateFeatureFlagDto;
    const updateDto = { name: "Novo nome" } as UpdateFeatureFlagDto;
    createService.create.mockResolvedValue(flag);
    updateService.update.mockResolvedValue(flag);
    updateService.toggle.mockResolvedValue({ ...flag, enabled: false });
    deleteService.remove.mockResolvedValue(undefined);

    await controller.create(createDto);
    await controller.update(flag.key, updateDto);
    await controller.toggle(flag.key);
    await expect(controller.remove(flag.key)).resolves.toBeUndefined();

    expect(createService.create).toHaveBeenCalledWith(createDto);
    expect(updateService.update).toHaveBeenCalledWith(flag.key, updateDto);
    expect(updateService.toggle).toHaveBeenCalledWith(flag.key);
    expect(deleteService.remove).toHaveBeenCalledWith(flag.key);
  });

  it("returns the catalog synchronization result", async () => {
    createService.synchronizeCatalog.mockResolvedValue({
      created: [flag],
      retired: ["legacy-flag"],
    });

    await expect(controller.seed()).resolves.toEqual({
      message: "Catálogo de feature flags conferido",
      count: 1,
      created: [flag],
      retired: ["legacy-flag"],
    });
  });
});
