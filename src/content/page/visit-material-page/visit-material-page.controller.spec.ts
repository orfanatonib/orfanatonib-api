import { Test } from "@nestjs/testing";
import { RuleException } from "src/common/exceptions";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { VisitMaterialsPageController } from "./visit-material-page.controller";
import { CreateVisitMaterialPageService } from "./services/create-visit-material-page.service";
import { GetVisitMaterialPageService } from "./services/get-visit-material-page.service";
import { UpdateVisitMaterialPageService } from "./services/update-visit-material-page.service";
import { DeleteVisitMaterialPageService } from "./services/delete-visit-material-page.service";
import { SetCurrentVisitMaterialPageService } from "./services/set-current-visit-material-page.service";
import { CreateVisitMaterialsPageDto } from "./dto/create-visit-material-page.dto";
import { UpdateVisitMaterialsPageDto } from "./dto/update-visit-material-page.dto";
import { TestamentType } from "./enums/testament-type.enum";
import { buildMulterFile } from "./visit-material-page.fixtures";

/**
 * `@UseGuards` stores class guards on the constructor and method guards on the
 * method function itself, so each level is read from its own target.
 */
const readGuards = (target: object): unknown[] => {
  const metadata: unknown = Reflect.getMetadata("__guards__", target);
  return Array.isArray(metadata) ? metadata : [];
};

const readMethodGuards = (
  method: keyof VisitMaterialsPageController,
): unknown[] =>
  readGuards(VisitMaterialsPageController.prototype[method] as object);

describe("VisitMaterialsPageController", () => {
  const createService = { execute: jest.fn() };
  const getService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findCurrentWeek: jest.fn(),
  };
  const updateService = { execute: jest.fn() };
  const deleteService = { execute: jest.fn() };
  const setCurrentService = { execute: jest.fn() };

  const validPayload = JSON.stringify({
    pageTitle: "Materiais da visita",
    pageSubtitle: "Subtítulo",
    pageDescription: "Descrição",
  });

  let controller: VisitMaterialsPageController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [VisitMaterialsPageController],
      providers: [
        { provide: CreateVisitMaterialPageService, useValue: createService },
        { provide: GetVisitMaterialPageService, useValue: getService },
        { provide: UpdateVisitMaterialPageService, useValue: updateService },
        { provide: DeleteVisitMaterialPageService, useValue: deleteService },
        {
          provide: SetCurrentVisitMaterialPageService,
          useValue: setCurrentService,
        },
      ],
    }).compile();

    controller = moduleRef.get(VisitMaterialsPageController);
  });

  it("is protected by the JWT guard", () => {
    expect(readGuards(VisitMaterialsPageController)).toContain(JwtAuthGuard);
  });

  it.each([["create"], ["update"], ["remove"], ["setCurrentMaterial"]])(
    "restricts %s to administrators",
    (method) => {
      expect(
        readMethodGuards(method as keyof VisitMaterialsPageController),
      ).toContain(AdminRoleGuard);
    },
  );

  it.each([["findAll"], ["findOne"], ["findCurrentMaterial"]])(
    "leaves %s open to any authenticated user",
    (method) => {
      expect(
        readMethodGuards(method as keyof VisitMaterialsPageController),
      ).not.toContain(AdminRoleGuard);
    },
  );

  it("parses the multipart payload before delegating the creation", async () => {
    const file = buildMulterFile({ fieldname: "file-1" });
    createService.execute.mockResolvedValue({ id: "page-id" });

    await controller.create([file], validPayload);

    const [dto, files] = createService.execute.mock.calls[0] as [
      CreateVisitMaterialsPageDto,
      Record<string, Express.Multer.File>,
    ];
    expect(dto).toBeInstanceOf(CreateVisitMaterialsPageDto);
    expect(dto.pageTitle).toBe("Materiais da visita");
    expect(files).toEqual({ "file-1": file });
  });

  it("rejects an invalid payload before reaching the service", async () => {
    await expect(controller.create([], "{ not json")).rejects.toBeInstanceOf(
      RuleException,
    );
    expect(createService.execute).not.toHaveBeenCalled();
  });

  it("parses the payload and forwards the id on update", async () => {
    updateService.execute.mockResolvedValue({ id: "page-id" });
    const payload = JSON.stringify({
      id: "page-id",
      pageTitle: "Materiais da visita",
      pageSubtitle: "Subtítulo",
      pageDescription: "Descrição",
      currentWeek: true,
      testament: TestamentType.NEW_TESTAMENT,
    });

    await controller.update("page-id", [], payload);

    const [id, dto] = updateService.execute.mock.calls[0] as [
      string,
      UpdateVisitMaterialsPageDto,
    ];
    expect(id).toBe("page-id");
    expect(dto).toBeInstanceOf(UpdateVisitMaterialsPageDto);
    expect(dto.currentWeek).toBe(true);
  });

  it("delegates the listing with the query", async () => {
    getService.findAll.mockResolvedValue([]);
    const query = { testament: TestamentType.OLD_TESTAMENT };

    await controller.findAll(query);

    expect(getService.findAll).toHaveBeenCalledWith(query);
  });

  it("delegates the detail lookup", async () => {
    getService.findOne.mockResolvedValue({ id: "page-id" });

    await expect(controller.findOne("page-id")).resolves.toMatchObject({
      id: "page-id",
    });
  });

  it("returns null when no current material is set", async () => {
    getService.findCurrentWeek.mockResolvedValue(null);

    await expect(controller.findCurrentMaterial()).resolves.toBeNull();
  });

  it("delegates the deletion and returns no payload", async () => {
    deleteService.execute.mockResolvedValue(undefined);

    await expect(controller.remove("page-id")).resolves.toBeUndefined();
    expect(deleteService.execute).toHaveBeenCalledWith("page-id");
  });

  it("returns the promoted page when setting the current material", async () => {
    setCurrentService.execute.mockResolvedValue({
      id: "page-id",
      currentWeek: true,
    });

    await expect(
      controller.setCurrentMaterial("page-id"),
    ).resolves.toMatchObject({ id: "page-id", currentWeek: true });
    expect(setCurrentService.execute).toHaveBeenCalledWith("page-id");
  });
});
