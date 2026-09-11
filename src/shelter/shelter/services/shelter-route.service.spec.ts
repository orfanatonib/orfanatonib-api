import { Test } from "@nestjs/testing";
import { EntityManager } from "typeorm";
import { RouteService } from "src/infrastructure/route/route.service";
import { RouteType } from "src/infrastructure/route/route-page.entity";
import { ShelterRouteService } from "./shelter-route.service";
import {
  SHELTER_DEFAULT_ROUTE_DESCRIPTION,
  SHELTER_ROUTE_ENTITY_TYPE,
  SHELTER_ROUTE_PREFIX,
} from "../constants";
import {
  buildAddressEntity,
  buildRouteEntity,
  buildShelterEntity,
} from "../shelter.fixtures";

describe("ShelterRouteService", () => {
  const routeService = {
    generateAvailablePath: jest.fn(),
    createRouteWithManager: jest.fn(),
    createRoute: jest.fn(),
    upsertRoute: jest.fn(),
    findRouteByEntityId: jest.fn(),
    removeRouteByEntity: jest.fn(),
  };
  const manager = {} as EntityManager;

  let service: ShelterRouteService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ShelterRouteService,
        { provide: RouteService, useValue: routeService },
      ],
    }).compile();

    service = moduleRef.get(ShelterRouteService);

    routeService.generateAvailablePath.mockResolvedValue("abrigo_esperanca");
    routeService.createRouteWithManager.mockResolvedValue(buildRouteEntity());
    routeService.createRoute.mockResolvedValue(buildRouteEntity());
    routeService.upsertRoute.mockImplementation(
      (id: string, updates: Record<string, unknown>) =>
        Promise.resolve(buildRouteEntity({ id, ...updates })),
    );
    routeService.findRouteByEntityId.mockResolvedValue(buildRouteEntity());
  });

  describe("buildSubtitle", () => {
    it("summarizes the shelter address", () => {
      expect(ShelterRouteService.buildSubtitle(buildAddressEntity())).toBe(
        "Manaus - AM, Centro 100",
      );
    });

    it("tolerates an address with no number", () => {
      expect(
        ShelterRouteService.buildSubtitle(
          buildAddressEntity({ number: undefined }),
        ),
      ).toBe("Manaus - AM, Centro");
    });

    it("returns an empty subtitle when there is no address", () => {
      expect(ShelterRouteService.buildSubtitle(null)).toBe("");
      expect(ShelterRouteService.buildSubtitle(undefined)).toBe("");
    });
  });

  describe("createForShelter", () => {
    it("creates the route inside the caller transaction, with the module prefix", async () => {
      const shelter = buildShelterEntity();

      await service.createForShelter(
        manager,
        shelter,
        "Descrição do abrigo",
        "https://bucket/foto.png",
      );

      expect(routeService.generateAvailablePath).toHaveBeenCalledWith(
        shelter.name,
        SHELTER_ROUTE_PREFIX,
      );
      expect(routeService.createRouteWithManager).toHaveBeenCalledWith(
        manager,
        {
          title: shelter.name,
          subtitle: "Manaus - AM, Centro 100",
          description: "Descrição do abrigo",
          path: "abrigo_esperanca",
          type: RouteType.PAGE,
          entityId: shelter.id,
          idToFetch: shelter.id,
          entityType: SHELTER_ROUTE_ENTITY_TYPE,
          image: "https://bucket/foto.png",
          public: true,
        },
      );
    });

    it("falls back to the default description when none is given", async () => {
      await service.createForShelter(manager, buildShelterEntity(), "", "");

      expect(routeService.createRouteWithManager).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          description: SHELTER_DEFAULT_ROUTE_DESCRIPTION,
        }),
      );
    });
  });

  describe("syncWithShelter", () => {
    it("creates the route when the shelter still has none", async () => {
      routeService.findRouteByEntityId.mockResolvedValue(null);

      await service.syncWithShelter(
        buildShelterEntity(),
        { name: "Novo nome" },
        "https://bucket/foto.png",
      );

      expect(routeService.createRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: SHELTER_ROUTE_ENTITY_TYPE,
          prefix: SHELTER_ROUTE_PREFIX,
          image: "https://bucket/foto.png",
          public: true,
        }),
      );
      expect(routeService.upsertRoute).not.toHaveBeenCalled();
    });

    it("creates the route with the shelter description and no image", async () => {
      routeService.findRouteByEntityId.mockResolvedValue(null);

      await service.syncWithShelter(
        buildShelterEntity({
          description: undefined,
          address: undefined as unknown as ReturnType<
            typeof buildAddressEntity
          >,
        }),
        {},
      );

      expect(routeService.createRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Abrigo Esperança",
          subtitle: "",
          description: "",
          image: "",
        }),
      );
    });

    it("mirrors name, description, address and image at once", async () => {
      await service.syncWithShelter(
        buildShelterEntity(),
        {
          name: "Abrigo Novo",
          description: "Nova descrição",
          addressChanged: true,
        },
        "https://bucket/foto.png",
      );

      expect(routeService.upsertRoute).toHaveBeenCalledWith("route-id", {
        title: "Abrigo Novo",
        path: SHELTER_ROUTE_PREFIX,
        description: "Nova descrição",
        subtitle: "Manaus - AM, Centro 100",
        image: "https://bucket/foto.png",
      });
    });

    it("clears the route description when the shelter description was emptied", async () => {
      await service.syncWithShelter(buildShelterEntity(), { description: "" });

      expect(routeService.upsertRoute).toHaveBeenCalledWith("route-id", {
        description: "",
      });
    });

    it("mirrors only what actually changed", async () => {
      await service.syncWithShelter(buildShelterEntity(), {
        description: "Nova descrição",
      });

      expect(routeService.upsertRoute).toHaveBeenCalledWith("route-id", {
        description: "Nova descrição",
      });
    });

    it("asks for a new path when the name changed", async () => {
      await service.syncWithShelter(buildShelterEntity(), {
        name: "Abrigo Novo",
      });

      expect(routeService.upsertRoute).toHaveBeenCalledWith("route-id", {
        title: "Abrigo Novo",
        path: SHELTER_ROUTE_PREFIX,
      });
    });

    it("refreshes the subtitle when the address changed", async () => {
      await service.syncWithShelter(buildShelterEntity(), {
        addressChanged: true,
      });

      expect(routeService.upsertRoute).toHaveBeenCalledWith("route-id", {
        subtitle: "Manaus - AM, Centro 100",
      });
    });

    it("clears the description when it was emptied", async () => {
      await service.syncWithShelter(buildShelterEntity(), {
        description: undefined,
      });

      expect(routeService.upsertRoute).not.toHaveBeenCalled();
    });

    it("does not write when nothing changed", async () => {
      const route = buildRouteEntity();
      routeService.findRouteByEntityId.mockResolvedValue(route);

      await expect(
        service.syncWithShelter(buildShelterEntity(), {}),
      ).resolves.toBe(route);
      expect(routeService.upsertRoute).not.toHaveBeenCalled();
    });
  });

  it("findByShelter delegates the lookup by entity id", async () => {
    await service.findByShelter("shelter-id");

    expect(routeService.findRouteByEntityId).toHaveBeenCalledWith("shelter-id");
  });

  it("removeForShelter matches the entityType the creation writes", async () => {
    await service.removeForShelter("shelter-id");

    expect(routeService.removeRouteByEntity).toHaveBeenCalledWith(
      SHELTER_ROUTE_ENTITY_TYPE,
      "shelter-id",
    );
  });
});
