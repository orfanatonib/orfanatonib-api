import { Test } from "@nestjs/testing";
import {
  AccessDeniedException,
  ResourceNotFoundException,
} from "src/common/exceptions";
import { GetFeatureFlagsService } from "src/core/feature-flags/services/get-feature-flags.service";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { SheltersRepository } from "../repositories/shelters.repository";
import { GetSheltersService } from "./get-shelters.service";
import { ShelterMediaService } from "./shelter-media.service";
import { SHELTER_MESSAGES } from "../constants";
import {
  buildAdminContext,
  buildAnonymousContext,
  buildLeaderContext,
  buildMemberContext,
  buildQuerySheltersDto,
  buildShelterEntity,
} from "../shelter.fixtures";

describe("GetSheltersService", () => {
  const repository = {
    findAllPaginated: jest.fn(),
    findAllSimple: jest.fn(),
    findOneOrFailForResponse: jest.fn(),
    findShelterIdsForLeader: jest.fn(),
    list: jest.fn(),
    listTeamsForPublic: jest.fn(),
  };
  const mediaService = {
    attachShelterPhotos: jest.fn(),
    attachAll: jest.fn(),
  };
  const featureFlagsService = { isEnabled: jest.fn() };

  let service: GetSheltersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        GetSheltersService,
        { provide: SheltersRepository, useValue: repository },
        { provide: ShelterMediaService, useValue: mediaService },
        { provide: GetFeatureFlagsService, useValue: featureFlagsService },
      ],
    }).compile();

    service = moduleRef.get(GetSheltersService);

    repository.findAllPaginated.mockResolvedValue({
      items: [buildShelterEntity()],
      total: 1,
    });
    repository.findAllSimple.mockResolvedValue([buildShelterEntity()]);
    repository.findOneOrFailForResponse.mockResolvedValue(buildShelterEntity());
    repository.findShelterIdsForLeader.mockResolvedValue(["shelter-id"]);
    repository.list.mockResolvedValue([]);
    repository.listTeamsForPublic.mockResolvedValue([]);
    mediaService.attachShelterPhotos.mockImplementation(
      (shelters: unknown) => shelters,
    );
    mediaService.attachAll.mockImplementation((shelters: unknown) => shelters);
    featureFlagsService.isEnabled.mockResolvedValue(true);
  });

  describe("findAllPaginated", () => {
    it("returns the page envelope the frontend consumes", async () => {
      repository.findAllPaginated.mockResolvedValue({
        items: [buildShelterEntity()],
        total: 25,
      });

      const result = await service.findAllPaginated(
        buildQuerySheltersDto({ page: 2, limit: 10 }),
        buildAdminContext(),
      );

      expect(result).toMatchObject({
        total: 25,
        page: 2,
        limit: 10,
        pageCount: 3,
      });
      expect(result.items[0].id).toBe("shelter-id");
    });

    it("falls back to the module defaults when the query omits paging", async () => {
      const result = await service.findAllPaginated(
        buildQuerySheltersDto({ page: undefined, limit: undefined }),
        buildAdminContext(),
      );

      expect(result).toMatchObject({ page: 1, limit: 10, pageCount: 1 });
    });

    it("does not divide by zero when the limit is zero", async () => {
      const result = await service.findAllPaginated(
        buildQuerySheltersDto({ limit: 0 }),
        buildAdminContext(),
      );

      expect(result.pageCount).toBe(0);
    });

    it("scopes the query to the actor and attaches the photos in one pass", async () => {
      const actor = buildLeaderContext();

      await service.findAllPaginated(buildQuerySheltersDto(), actor);

      expect(repository.findAllPaginated).toHaveBeenCalledWith(
        expect.any(Object),
        actor,
      );
      expect(mediaService.attachShelterPhotos).toHaveBeenCalledTimes(1);
    });

    it("hides the address when the feature flag is off", async () => {
      featureFlagsService.isEnabled.mockResolvedValue(false);

      const result = await service.findAllPaginated(
        buildQuerySheltersDto(),
        buildAdminContext(),
      );

      expect(featureFlagsService.isEnabled).toHaveBeenCalledWith(
        FeatureFlagKeys.SHELTER_ADDRESS,
      );
      expect(result.items[0].address).toBeUndefined();
    });

    it.each([
      ["member", buildMemberContext()],
      ["actor without role", buildAnonymousContext()],
    ])("denies the administrative listing to a %s", async (_role, actor) => {
      await expect(
        service.findAllPaginated(buildQuerySheltersDto(), actor),
      ).rejects.toThrow(AccessDeniedException);
      expect(repository.findAllPaginated).not.toHaveBeenCalled();
    });
  });

  describe("findAllSimple", () => {
    it("is open to a member, unlike the administrative listing", async () => {
      const result = await service.findAllSimple(buildMemberContext());

      expect(result).toHaveLength(1);
      expect(repository.findAllSimple).toHaveBeenCalledWith(
        buildMemberContext(),
      );
      expect(mediaService.attachAll).toHaveBeenCalledTimes(1);
    });
  });

  describe("findOne", () => {
    it("returns the shelter with everything attached", async () => {
      const result = await service.findOne("shelter-id", buildAdminContext());

      expect(result.id).toBe("shelter-id");
      expect(mediaService.attachAll).toHaveBeenCalledWith([
        expect.objectContaining({ id: "shelter-id" }),
      ]);
    });

    it("reports 404 for a shelter outside the actor scope", async () => {
      repository.findOneOrFailForResponse.mockResolvedValue(null);

      await expect(
        service.findOne("shelter-id", buildLeaderContext()),
      ).rejects.toThrow(
        new ResourceNotFoundException(SHELTER_MESSAGES.NOT_FOUND, {
          id: "shelter-id",
        }),
      );
    });
  });

  describe("existsForActor", () => {
    it("answers without exposing the shelter payload", async () => {
      await expect(
        service.existsForActor("shelter-id", buildLeaderContext()),
      ).resolves.toBe(true);
    });

    it("answers false for a shelter the actor cannot reach", async () => {
      repository.findOneOrFailForResponse.mockResolvedValue(null);

      await expect(
        service.existsForActor("shelter-id", buildLeaderContext()),
      ).resolves.toBe(false);
    });
  });

  describe("getTeamsQuantity", () => {
    it("returns the quantity stored on the shelter", async () => {
      await expect(
        service.getTeamsQuantity("shelter-id", buildAdminContext()),
      ).resolves.toEqual({ id: "shelter-id", teamsQuantity: 1 });
    });

    it("reports zero when the shelter has no quantity set", async () => {
      repository.findOneOrFailForResponse.mockResolvedValue(
        buildShelterEntity({ teamsQuantity: undefined }),
      );

      await expect(
        service.getTeamsQuantity("shelter-id", buildAdminContext()),
      ).resolves.toEqual({ id: "shelter-id", teamsQuantity: 0 });
    });

    it("reports 404 for a shelter the actor cannot reach", async () => {
      repository.findOneOrFailForResponse.mockResolvedValue(null);

      await expect(
        service.getTeamsQuantity("shelter-id", buildLeaderContext()),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  it("list forwards the address visibility to the repository", async () => {
    featureFlagsService.isEnabled.mockResolvedValue(false);

    await service.list(buildAdminContext());

    expect(repository.list).toHaveBeenCalledWith(buildAdminContext(), false);
  });

  it("listTeamsForPublic needs no actor", async () => {
    await service.listTeamsForPublic();

    expect(repository.listTeamsForPublic).toHaveBeenCalledTimes(1);
  });

  it("findShelterIdsForLeader is the contract other modules use", async () => {
    await expect(
      service.findShelterIdsForLeader("leader-user-id"),
    ).resolves.toEqual(["shelter-id"]);
    expect(repository.findShelterIdsForLeader).toHaveBeenCalledWith(
      "leader-user-id",
    );
  });
});
