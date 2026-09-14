import { Test } from "@nestjs/testing";
import { HttpStatus } from "@nestjs/common";
import { ResourceNotFoundException } from "src/common/exceptions";
import { GetSheltersService } from "src/shelter/shelter/services/get-shelters.service";
import { ShelteredShelterAccessService } from "./sheltered-shelter-access.service";
import { buildAdminContext, buildLeaderContext } from "../sheltered.fixtures";

describe("ShelteredShelterAccessService", () => {
  const getSheltersService = { existsForActor: jest.fn() };

  let service: ShelteredShelterAccessService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ShelteredShelterAccessService,
        { provide: GetSheltersService, useValue: getSheltersService },
      ],
    }).compile();

    service = moduleRef.get(ShelteredShelterAccessService);
  });

  it("resolves when the shelter is visible to the actor", async () => {
    getSheltersService.existsForActor.mockResolvedValue(true);

    await expect(
      service.assertReachable("shelter-id", buildLeaderContext()),
    ).resolves.toBeUndefined();

    expect(getSheltersService.existsForActor).toHaveBeenCalledWith(
      "shelter-id",
      {
        role: "leader",
        userId: "leader-user-id",
      },
    );
  });

  it("passes the actor through as-is, including a null role", async () => {
    getSheltersService.existsForActor.mockResolvedValue(true);

    await service.assertReachable("shelter-id", { userId: null, role: null });

    expect(getSheltersService.existsForActor).toHaveBeenCalledWith(
      "shelter-id",
      {
        role: null,
        userId: null,
      },
    );
  });

  it("raises a 404 when the shelter is missing or out of scope", async () => {
    getSheltersService.existsForActor.mockResolvedValue(false);

    const error = await service
      .assertReachable("shelter-id", buildAdminContext())
      .catch((thrown: ResourceNotFoundException) => thrown);

    expect(error).toBeInstanceOf(ResourceNotFoundException);
    expect((error as ResourceNotFoundException).getStatus()).toBe(
      HttpStatus.NOT_FOUND,
    );
  });
});
