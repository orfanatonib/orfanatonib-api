import { Test } from "@nestjs/testing";
import { AuthenticatedRequest, UserRole } from "src/core/auth/auth.types";
import { RuleException } from "src/common/exceptions";
import { GetFeatureFlagsService } from 'src/core/feature-flags/services/get-feature-flags.service';
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { SheltersController } from "./shelters.controller";
import { CreateSheltersService } from "./services/create-shelters.service";
import { GetSheltersService } from "./services/get-shelters.service";
import { UpdateSheltersService } from "./services/update-shelters.service";
import { DeleteSheltersService } from "./services/delete-shelters.service";
import { CreateShelterDto } from "./dto/create-shelter.dto";
import { UpdateShelterDto } from "./dto/update-shelter.dto";
import {
  SHELTER_MEDIA_PAYLOAD_FIELD,
  SHELTER_MESSAGES,
  SHELTER_PAYLOAD_FIELD,
} from "./constants";
import {
  buildCreateShelterDto,
  buildQuerySheltersDto,
  buildShelterEntity,
  buildUploadedFile,
} from "./shelter.fixtures";

describe("SheltersController", () => {
  const createService = { execute: jest.fn() };
  const getService = {
    findAllPaginated: jest.fn(),
    findAllSimple: jest.fn(),
    findOne: jest.fn(),
    list: jest.fn(),
    listTeamsForPublic: jest.fn(),
    getTeamsQuantity: jest.fn(),
  };
  const updateService = { execute: jest.fn(), updateMedia: jest.fn() };
  const deleteService = { execute: jest.fn() };
  const featureFlagsService = { isEnabled: jest.fn() };

  const request = {
    user: { userId: "admin-user-id", role: UserRole.ADMIN },
  } as AuthenticatedRequest;
  const actor = { userId: "admin-user-id", role: UserRole.ADMIN };

  let controller: SheltersController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [SheltersController],
      providers: [
        { provide: CreateSheltersService, useValue: createService },
        { provide: GetSheltersService, useValue: getService },
        { provide: UpdateSheltersService, useValue: updateService },
        { provide: DeleteSheltersService, useValue: deleteService },
        { provide: GetFeatureFlagsService, useValue: featureFlagsService },
      ],
    }).compile();

    controller = moduleRef.get(SheltersController);

    createService.execute.mockResolvedValue(buildShelterEntity());
    updateService.execute.mockResolvedValue(buildShelterEntity());
    updateService.updateMedia.mockResolvedValue(buildShelterEntity());
    deleteService.execute.mockResolvedValue({
      message: SHELTER_MESSAGES.DELETED,
    });
    getService.findAllPaginated.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      pageCount: 0,
    });
    getService.findAllSimple.mockResolvedValue([]);
    getService.findOne.mockResolvedValue({ id: "shelter-id" });
    getService.list.mockResolvedValue([]);
    getService.listTeamsForPublic.mockResolvedValue([]);
    getService.getTeamsQuantity.mockResolvedValue({
      id: "shelter-id",
      teamsQuantity: 1,
    });
    featureFlagsService.isEnabled.mockResolvedValue(true);
  });

  describe("read endpoints", () => {
    it("forwards the query and the actor resolved from the token", async () => {
      const query = buildQuerySheltersDto();

      await controller.findAllPaginated(query, request);

      expect(getService.findAllPaginated).toHaveBeenCalledWith(query, actor);
    });

    it.each([
      [
        "findAllSimple",
        () => controller.findAllSimple(request),
        () => getService.findAllSimple,
      ],
      ["list", () => controller.list(request), () => getService.list],
    ])(
      "%s resolves the actor from the request",
      async (_name, call, target) => {
        await call();

        expect(target()).toHaveBeenCalledWith(actor);
      },
    );

    it("findOne and getTeamsQuantity forward the id and the actor", async () => {
      await controller.findOne("shelter-id", request);
      await controller.getTeamsQuantity("shelter-id", request);

      expect(getService.findOne).toHaveBeenCalledWith("shelter-id", actor);
      expect(getService.getTeamsQuantity).toHaveBeenCalledWith(
        "shelter-id",
        actor,
      );
    });

    it("listTeamsForPublic is open and takes no actor", async () => {
      await controller.listTeamsForPublic();

      expect(getService.listTeamsForPublic).toHaveBeenCalledWith();
    });
  });

  describe("create", () => {
    it("parses the multipart payload, indexes the files and maps the response", async () => {
      const dto = buildCreateShelterDto();
      const file = buildUploadedFile({ fieldname: "cover" });

      const result = await controller.create([file], request, {
        [SHELTER_PAYLOAD_FIELD]: JSON.stringify(dto),
      });

      expect(createService.execute).toHaveBeenCalledWith(
        expect.any(CreateShelterDto),
        actor,
        { cover: file },
      );
      expect(result.id).toBe("shelter-id");
      expect(result).not.toHaveProperty("route");
    });

    it("hides the address when the feature flag is off", async () => {
      featureFlagsService.isEnabled.mockResolvedValue(false);

      const result = await controller.create([], request, {
        [SHELTER_PAYLOAD_FIELD]: JSON.stringify(buildCreateShelterDto()),
      });

      expect(featureFlagsService.isEnabled).toHaveBeenCalledWith(
        FeatureFlagKeys.SHELTER_ADDRESS,
      );
      expect(result.address).toBeUndefined();
    });

    it("rejects an empty body before reaching the use case", async () => {
      await expect(controller.create([], request, {})).rejects.toThrow(
        new RuleException(SHELTER_MESSAGES.PAYLOAD_REQUIRED),
      );
      expect(createService.execute).not.toHaveBeenCalled();
    });

    it("rejects a payload that fails validation", async () => {
      await expect(
        controller.create([], request, {
          [SHELTER_PAYLOAD_FIELD]: JSON.stringify({ name: "" }),
        }),
      ).rejects.toThrow(RuleException);
      expect(createService.execute).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("parses the payload and forwards id, actor and files", async () => {
      const file = buildUploadedFile({ fieldname: "cover" });

      await controller.update("shelter-id", [file], request, {
        [SHELTER_PAYLOAD_FIELD]: JSON.stringify({
          name: "Abrigo Novo",
          teamsQuantity: 2,
        }),
      });

      expect(updateService.execute).toHaveBeenCalledWith(
        "shelter-id",
        expect.any(UpdateShelterDto),
        actor,
        { cover: file },
      );
    });

    it("accepts the fields loose in the body", async () => {
      await controller.update("shelter-id", [], request, {
        name: "Abrigo Novo",
        teamsQuantity: "2",
      });

      expect(updateService.execute).toHaveBeenCalledWith(
        "shelter-id",
        expect.objectContaining({ name: "Abrigo Novo", teamsQuantity: 2 }),
        actor,
        {},
      );
    });
  });

  describe("updateMedia", () => {
    it("parses the media payload and forwards the uploaded file", async () => {
      const file = buildUploadedFile({ fieldname: "cover" });

      await controller.updateMedia("shelter-id", [file], request, {
        [SHELTER_MEDIA_PAYLOAD_FIELD]: JSON.stringify({ title: "Foto" }),
      });

      expect(updateService.updateMedia).toHaveBeenCalledWith(
        "shelter-id",
        { title: "Foto" },
        actor,
        { cover: file },
      );
    });

    it("rejects a request with no media at all", async () => {
      await expect(
        controller.updateMedia("shelter-id", [], request, {}),
      ).rejects.toThrow(
        new RuleException(SHELTER_MESSAGES.MEDIA_PAYLOAD_REQUIRED),
      );
      expect(updateService.updateMedia).not.toHaveBeenCalled();
    });
  });

  it("remove forwards the id and the actor", async () => {
    await expect(controller.remove("shelter-id", request)).resolves.toEqual({
      message: SHELTER_MESSAGES.DELETED,
    });

    expect(deleteService.execute).toHaveBeenCalledWith("shelter-id", actor);
  });

  it("resolves a null actor when the request carries no user", async () => {
    await controller.findAllSimple({} as AuthenticatedRequest);

    expect(getService.findAllSimple).toHaveBeenCalledWith({
      userId: null,
      role: null,
    });
  });
});
