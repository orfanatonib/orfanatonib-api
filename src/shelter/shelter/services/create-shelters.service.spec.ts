import { Test } from "@nestjs/testing";
import { EntityManager } from "typeorm";
import { AccessDeniedException } from "src/common/exceptions";
import { SheltersRepository } from "../repositories/shelters.repository";
import { CreateSheltersService } from "./create-shelters.service";
import { GetSheltersService } from "./get-shelters.service";
import { ShelterMediaService } from "./shelter-media.service";
import { ShelterRouteService } from "./shelter-route.service";
import { ShelterTeamsService } from "./shelter-teams.service";
import {
  buildAdminContext,
  buildAnonymousContext,
  buildCreateShelterDto,
  buildLeaderContext,
  buildMemberContext,
  buildRouteEntity,
  buildShelterEntity,
  buildUploadedFile,
} from "../shelter.fixtures";

describe("CreateSheltersService", () => {
  const manager = {} as EntityManager;

  const repository = {
    createShelter: jest.fn(),
    runInTransaction: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };
  const getService = { findEntityOrFail: jest.fn() };
  const teamsService = { createForShelter: jest.fn() };
  const mediaService = {
    upsertMainPhoto: jest.fn(),
    attachAll: jest.fn(),
    removeAllForShelter: jest.fn(),
  };
  const routeService = { createForShelter: jest.fn() };

  let service: CreateSheltersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateSheltersService,
        { provide: SheltersRepository, useValue: repository },
        { provide: GetSheltersService, useValue: getService },
        { provide: ShelterTeamsService, useValue: teamsService },
        { provide: ShelterMediaService, useValue: mediaService },
        { provide: ShelterRouteService, useValue: routeService },
      ],
    }).compile();
    moduleRef.useLogger(false);

    service = moduleRef.get(CreateSheltersService);

    repository.createShelter.mockResolvedValue(buildShelterEntity());
    repository.runInTransaction.mockImplementation(
      (work: (m: EntityManager) => Promise<unknown>) => work(manager),
    );
    repository.save.mockImplementation((shelter: unknown) =>
      Promise.resolve(shelter),
    );
    getService.findEntityOrFail.mockResolvedValue(buildShelterEntity());
    repository.deleteById.mockResolvedValue(undefined);
    mediaService.removeAllForShelter.mockResolvedValue(0);
    teamsService.createForShelter.mockResolvedValue(undefined);
    mediaService.upsertMainPhoto.mockResolvedValue("https://bucket/foto.png");
    mediaService.attachAll.mockImplementation((shelters: unknown) => shelters);
    routeService.createForShelter.mockResolvedValue(buildRouteEntity());
  });

  it("persists the shelter, its teams and its route, then reloads the response", async () => {
    const dto = buildCreateShelterDto();
    const actor = buildAdminContext();

    const result = await service.execute(dto, actor);

    expect(repository.createShelter).toHaveBeenCalledWith(dto);
    expect(teamsService.createForShelter).toHaveBeenCalledWith(
      "shelter-id",
      dto.teamsQuantity,
      dto.teams,
    );
    expect(repository.runInTransaction).toHaveBeenCalledTimes(1);
    expect(routeService.createForShelter).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ id: "shelter-id" }),
      dto.description,
      "",
    );
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: "shelter-id" }),
      manager,
    );
    expect(getService.findEntityOrFail).toHaveBeenCalledWith(
      "shelter-id",
      actor,
    );
    expect(result.id).toBe("shelter-id");
  });

  it("attaches the media to the response, as the update does", async () => {
    await service.execute(buildCreateShelterDto(), buildAdminContext());

    expect(mediaService.attachAll).toHaveBeenCalledWith([
      expect.objectContaining({ id: "shelter-id" }),
    ]);
  });

  it("saves the main photo and carries its url into the route", async () => {
    const files = { cover: buildUploadedFile({ fieldname: "cover" }) };
    const dto = buildCreateShelterDto({
      mediaItem: { title: "Foto", fieldKey: "cover" },
    });

    await service.execute(dto, buildAdminContext(), files);

    expect(mediaService.upsertMainPhoto).toHaveBeenCalledWith(
      "shelter-id",
      dto.mediaItem,
      files,
    );
    expect(routeService.createForShelter).toHaveBeenCalledWith(
      manager,
      expect.anything(),
      dto.description,
      "https://bucket/foto.png",
    );
  });

  it("creates the shelter without media when none was sent", async () => {
    await service.execute(buildCreateShelterDto(), buildAdminContext());

    expect(mediaService.upsertMainPhoto).not.toHaveBeenCalled();
  });

  it("links the created route to the shelter in the same transaction", async () => {
    const route = buildRouteEntity({ id: "route-nova" });
    routeService.createForShelter.mockResolvedValue(route);

    await service.execute(buildCreateShelterDto(), buildAdminContext());

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ route }),
      manager,
    );
  });

  it.each([
    ["member", buildMemberContext()],
    ["actor without role", buildAnonymousContext()],
  ])(
    "denies creation to a %s before touching the database",
    async (_role, actor) => {
      await expect(
        service.execute(buildCreateShelterDto(), actor),
      ).rejects.toThrow(AccessDeniedException);

      expect(repository.createShelter).not.toHaveBeenCalled();
    },
  );
  it("denies a leader: only an admin creates a shelter, and nothing is written", async () => {
    await expect(
      service.execute(buildCreateShelterDto(), buildLeaderContext()),
    ).rejects.toBeInstanceOf(AccessDeniedException);

    expect(repository.createShelter).not.toHaveBeenCalled();
  });

  it("rolls the shelter back (rows, then media) when the photo is refused", async () => {
    const failure = new Error("arquivo inválido");
    mediaService.upsertMainPhoto.mockRejectedValue(failure);
    const dto = buildCreateShelterDto({
      mediaItem: { title: "Foto", fieldKey: "cover" },
    });

    await expect(service.execute(dto, buildAdminContext())).rejects.toBe(
      failure,
    );

    expect(mediaService.removeAllForShelter).toHaveBeenCalledWith("shelter-id");
    expect(repository.deleteById).toHaveBeenCalledWith("shelter-id");
    expect(getService.findEntityOrFail).not.toHaveBeenCalled();
  });

  it("surfaces the original failure even when the rollback itself fails", async () => {
    const failure = new Error("falha na equipe");
    teamsService.createForShelter.mockRejectedValue(failure);
    repository.deleteById.mockRejectedValue(new Error("banco fora"));

    await expect(
      service.execute(buildCreateShelterDto(), buildAdminContext()),
    ).rejects.toBe(failure);
  });
});
