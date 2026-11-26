import { Test } from "@nestjs/testing";
import {
  AccessDeniedException,
  ResourceNotFoundException,
} from "src/common/exceptions";
import { SheltersRepository } from "../repositories/shelters.repository";
import { DeleteSheltersService } from "./delete-shelters.service";
import { GetSheltersService } from "./get-shelters.service";
import { ShelterMediaService } from "./shelter-media.service";
import { SHELTER_MESSAGES } from "../constants";
import {
  buildAdminContext,
  buildAnonymousContext,
  buildLeaderContext,
  buildMemberContext,
  buildShelterEntity,
} from "../shelter.fixtures";

describe("DeleteSheltersService", () => {
  const repository = { deleteById: jest.fn() };
  const getService = { findEntityOrFail: jest.fn() };
  const mediaService = { removeAllForShelter: jest.fn() };

  let service: DeleteSheltersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeleteSheltersService,
        { provide: SheltersRepository, useValue: repository },
        { provide: GetSheltersService, useValue: getService },
        { provide: ShelterMediaService, useValue: mediaService },
      ],
    }).compile();
    moduleRef.useLogger(false);

    service = moduleRef.get(DeleteSheltersService);

    getService.findEntityOrFail.mockResolvedValue(buildShelterEntity());
    mediaService.removeAllForShelter.mockResolvedValue(2);
    repository.deleteById.mockResolvedValue(undefined);
  });

  it("clears the media, then hands the removal to the repository transaction", async () => {
    const actor = buildAdminContext();

    await expect(service.execute("shelter-id", actor)).resolves.toEqual({
      message: SHELTER_MESSAGES.DELETED,
    });

    expect(getService.findEntityOrFail).toHaveBeenCalledWith(
      "shelter-id",
      actor,
    );
    expect(mediaService.removeAllForShelter).toHaveBeenCalledWith("shelter-id");
    expect(repository.deleteById).toHaveBeenCalledWith("shelter-id");
    expect(
      mediaService.removeAllForShelter.mock.invocationCallOrder[0],
    ).toBeLessThan(repository.deleteById.mock.invocationCallOrder[0]);
  });

  it("does not remove the route on its own: that would cascade onto the shelter", async () => {
    await service.execute("shelter-id", buildAdminContext());

    expect(repository).not.toHaveProperty("removeRoute");
    expect(repository.deleteById).toHaveBeenCalledTimes(1);
  });

  it("still removes the shelter when it had no media", async () => {
    mediaService.removeAllForShelter.mockResolvedValue(0);

    await service.execute("shelter-id", buildAdminContext());

    expect(repository.deleteById).toHaveBeenCalledWith("shelter-id");
  });

  it("reports 404 — not 403 — for a shelter outside the actor scope", async () => {
    getService.findEntityOrFail.mockRejectedValue(
      new ResourceNotFoundException(SHELTER_MESSAGES.NOT_FOUND),
    );

    await expect(
      service.execute("shelter-id", buildLeaderContext()),
    ).rejects.toThrow(ResourceNotFoundException);

    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it.each([
    ["member", buildMemberContext()],
    ["actor without role", buildAnonymousContext()],
  ])("denies deletion to a %s before any lookup", async (_role, actor) => {
    await expect(service.execute("shelter-id", actor)).rejects.toThrow(
      AccessDeniedException,
    );

    expect(getService.findEntityOrFail).not.toHaveBeenCalled();
    expect(repository.deleteById).not.toHaveBeenCalled();
  });
});
