import { Test } from "@nestjs/testing";
import {
  AccessDeniedException,
  ResourceNotFoundException,
} from "src/common/exceptions";
import { UploadType } from "src/shared/media/media-item/media-item.entity";
import { SheltersRepository } from "../repositories/shelters.repository";
import { GetSheltersService } from "./get-shelters.service";
import { ShelterMediaService } from "./shelter-media.service";
import { ShelterRouteService } from "./shelter-route.service";
import { ShelterTeamsService } from "./shelter-teams.service";
import { UpdateSheltersService } from "./update-shelters.service";
import { SHELTER_MESSAGES } from "../constants";
import {
  buildAdminContext,
  buildAnonymousContext,
  buildLeaderContext,
  buildMemberContext,
  buildShelterEntity,
  buildUpdateShelterDto,
  buildUploadedFile,
} from "../shelter.fixtures";

describe("UpdateSheltersService", () => {
  const repository = { updateShelter: jest.fn() };
  const getService = { findEntityOrFail: jest.fn() };
  const teamsService = { syncForShelter: jest.fn() };
  const mediaService = { upsertMainPhoto: jest.fn(), attachAll: jest.fn() };
  const routeService = { syncWithShelter: jest.fn() };

  let service: UpdateSheltersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateSheltersService,
        { provide: SheltersRepository, useValue: repository },
        { provide: GetSheltersService, useValue: getService },
        { provide: ShelterTeamsService, useValue: teamsService },
        { provide: ShelterMediaService, useValue: mediaService },
        { provide: ShelterRouteService, useValue: routeService },
      ],
    }).compile();
    moduleRef.useLogger(false);

    service = moduleRef.get(UpdateSheltersService);

    repository.updateShelter.mockResolvedValue(buildShelterEntity());
    getService.findEntityOrFail.mockResolvedValue(buildShelterEntity());
    teamsService.syncForShelter.mockResolvedValue(undefined);
    mediaService.upsertMainPhoto.mockResolvedValue("https://bucket/nova.png");
    mediaService.attachAll.mockImplementation((shelters: unknown) => shelters);
    routeService.syncWithShelter.mockResolvedValue(undefined);
  });

  describe("execute", () => {
    it("updates the shelter and mirrors the change on the route", async () => {
      const dto = buildUpdateShelterDto({ name: "Abrigo Renomeado" });
      const actor = buildAdminContext();

      const result = await service.execute("shelter-id", dto, actor);

      expect(repository.updateShelter).toHaveBeenCalledWith("shelter-id", dto);
      expect(routeService.syncWithShelter).toHaveBeenCalledWith(
        expect.objectContaining({ id: "shelter-id" }),
        {
          name: "Abrigo Renomeado",
          description: undefined,
          addressChanged: false,
        },
        undefined,
      );
      expect(mediaService.attachAll).toHaveBeenCalledTimes(1);
      expect(result.id).toBe("shelter-id");
    });

    it("does not touch the route when nothing it mirrors changed", async () => {
      await service.execute(
        "shelter-id",
        buildUpdateShelterDto({ name: undefined }),
        buildAdminContext(),
      );

      expect(routeService.syncWithShelter).not.toHaveBeenCalled();
    });

    it("reconciles the teams when the quantity changed", async () => {
      getService.findEntityOrFail.mockResolvedValue(
        buildShelterEntity({ teamsQuantity: 1 }),
      );

      await service.execute(
        "shelter-id",
        buildUpdateShelterDto({ teamsQuantity: 3 }),
        buildAdminContext(),
      );

      expect(teamsService.syncForShelter).toHaveBeenCalledWith(
        "shelter-id",
        3,
        undefined,
        1,
      );
    });

    it("reconciles the teams when only their content changed", async () => {
      const teams = [{ numberTeam: 1, description: "Nova" }];

      await service.execute(
        "shelter-id",
        buildUpdateShelterDto({ teamsQuantity: 1, teams }),
        buildAdminContext(),
      );

      expect(teamsService.syncForShelter).toHaveBeenCalledWith(
        "shelter-id",
        1,
        teams,
        1,
      );
    });

    it("leaves the teams alone when neither quantity nor payload changed", async () => {
      await service.execute(
        "shelter-id",
        buildUpdateShelterDto({ teamsQuantity: 1 }),
        buildAdminContext(),
      );

      expect(teamsService.syncForShelter).not.toHaveBeenCalled();
    });

    it("treats a shelter with no quantity as zero teams", async () => {
      getService.findEntityOrFail.mockResolvedValue(
        buildShelterEntity({ teamsQuantity: undefined }),
      );

      await service.execute(
        "shelter-id",
        buildUpdateShelterDto({ teamsQuantity: 2 }),
        buildAdminContext(),
      );

      expect(teamsService.syncForShelter).toHaveBeenCalledWith(
        "shelter-id",
        2,
        undefined,
        0,
      );
    });

    it("does not rewrite the photo when the payload brings no new source", async () => {
      await service.execute(
        "shelter-id",
        buildUpdateShelterDto({
          mediaItem: { title: "Mesma foto", isLocalFile: true },
        }),
        buildAdminContext(),
      );

      expect(mediaService.upsertMainPhoto).not.toHaveBeenCalled();
    });

    it("rewrites the photo from the uploaded file and refreshes the route image", async () => {
      const files = { cover: buildUploadedFile({ fieldname: "cover" }) };

      await service.execute(
        "shelter-id",
        buildUpdateShelterDto({
          name: undefined,
          mediaItem: { title: "Nova foto" },
        }),
        buildAdminContext(),
        files,
      );

      expect(mediaService.upsertMainPhoto).toHaveBeenCalledWith(
        "shelter-id",
        expect.objectContaining({
          fieldKey: "cover",
          isLocalFile: true,
          uploadType: UploadType.UPLOAD,
        }),
        files,
      );
      expect(routeService.syncWithShelter).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Object),
        "https://bucket/nova.png",
      );
    });

    it("rewrites the photo from a url with no file involved", async () => {
      await service.execute(
        "shelter-id",
        buildUpdateShelterDto({
          mediaItem: {
            url: "https://cdn/foto.png",
            uploadType: UploadType.LINK,
          },
        }),
        buildAdminContext(),
      );

      expect(mediaService.upsertMainPhoto).toHaveBeenCalledWith(
        "shelter-id",
        expect.objectContaining({
          url: "https://cdn/foto.png",
          uploadType: UploadType.LINK,
          fieldKey: undefined,
        }),
        {},
      );
    });

    it("keeps the fieldKey the payload chose over the first uploaded file", async () => {
      const files = {
        cover: buildUploadedFile({ fieldname: "cover" }),
        outro: buildUploadedFile({ fieldname: "outro" }),
      };

      await service.execute(
        "shelter-id",
        buildUpdateShelterDto({ mediaItem: { fieldKey: "outro" } }),
        buildAdminContext(),
        files,
      );

      expect(mediaService.upsertMainPhoto).toHaveBeenCalledWith(
        "shelter-id",
        expect.objectContaining({ fieldKey: "outro" }),
        files,
      );
    });

    it("reports 404 for a shelter outside the actor scope", async () => {
      getService.findEntityOrFail.mockRejectedValue(
        new ResourceNotFoundException(SHELTER_MESSAGES.NOT_FOUND),
      );

      await expect(
        service.execute(
          "shelter-id",
          buildUpdateShelterDto(),
          buildLeaderContext(),
        ),
      ).rejects.toThrow(ResourceNotFoundException);

      expect(repository.updateShelter).not.toHaveBeenCalled();
    });

    it.each([
      ["member", buildMemberContext()],
      ["actor without role", buildAnonymousContext()],
    ])("denies the update to a %s", async (_role, actor) => {
      await expect(
        service.execute("shelter-id", buildUpdateShelterDto(), actor),
      ).rejects.toThrow(AccessDeniedException);

      expect(getService.findEntityOrFail).not.toHaveBeenCalled();
    });
  });

  describe("updateMedia", () => {
    it("builds the payload from the uploaded file when it is not described", async () => {
      const files = { cover: buildUploadedFile({ fieldname: "cover" }) };

      await service.updateMedia("shelter-id", {}, buildAdminContext(), files);

      expect(mediaService.upsertMainPhoto).toHaveBeenCalledWith(
        "shelter-id",
        {
          title: undefined,
          description: undefined,
          uploadType: UploadType.UPLOAD,
          url: undefined,
          isLocalFile: true,
          fieldKey: "cover",
        },
        files,
      );
      expect(routeService.syncWithShelter).toHaveBeenCalledWith(
        expect.anything(),
        {},
        "https://bucket/nova.png",
      );
    });

    it("treats a payload with no file as a link", async () => {
      await service.updateMedia(
        "shelter-id",
        { title: "Foto", url: "https://cdn/foto.png" },
        buildAdminContext(),
        {},
      );

      expect(mediaService.upsertMainPhoto).toHaveBeenCalledWith(
        "shelter-id",
        expect.objectContaining({
          title: "Foto",
          uploadType: UploadType.LINK,
          isLocalFile: false,
          fieldKey: undefined,
        }),
        {},
      );
    });

    it("respects the uploadType the caller declared", async () => {
      await service.updateMedia(
        "shelter-id",
        { uploadType: UploadType.LINK, url: "https://cdn/foto.png" },
        buildAdminContext(),
        { cover: buildUploadedFile({ fieldname: "cover" }) },
      );

      expect(mediaService.upsertMainPhoto).toHaveBeenCalledWith(
        "shelter-id",
        expect.objectContaining({ uploadType: UploadType.LINK }),
        expect.any(Object),
      );
    });

    it("reports 404 for a shelter outside the actor scope", async () => {
      getService.findEntityOrFail.mockRejectedValue(
        new ResourceNotFoundException(SHELTER_MESSAGES.NOT_FOUND),
      );

      await expect(
        service.updateMedia("shelter-id", {}, buildLeaderContext(), {}),
      ).rejects.toThrow(ResourceNotFoundException);

      expect(mediaService.upsertMainPhoto).not.toHaveBeenCalled();
    });

    it("denies the media update to a member", async () => {
      await expect(
        service.updateMedia("shelter-id", {}, buildMemberContext(), {}),
      ).rejects.toThrow(AccessDeniedException);
    });
  });
});
