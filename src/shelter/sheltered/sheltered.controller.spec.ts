import { Test } from "@nestjs/testing";
import { AuthenticatedRequest, UserRole } from "src/core/auth/auth.types";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { ShelteredController } from "./sheltered.controller";
import { CreateShelteredService } from "./services/create-sheltered.service";
import { GetShelteredService } from "./services/get-sheltered.service";
import { UpdateShelteredService } from "./services/update-sheltered.service";
import { DeleteShelteredService } from "./services/delete-sheltered.service";
import { ShelteredGender } from "./enums/sheltered-gender.enum";
import {
  buildCreateShelteredDto,
  buildQueryShelteredDto,
  buildQueryShelteredSimpleDto,
} from "./sheltered.fixtures";

describe("ShelteredController", () => {
  const createShelteredService = { execute: jest.fn() };
  const getShelteredService = {
    findAll: jest.fn(),
    findAllSimple: jest.fn(),
    findOne: jest.fn(),
  };
  const updateShelteredService = {
    execute: jest.fn(),
    updateStatus: jest.fn(),
  };
  const deleteShelteredService = { execute: jest.fn() };

  const request = {
    user: { userId: "leader-user-id", role: UserRole.LEADER },
  } as AuthenticatedRequest;
  const expectedActor = { userId: "leader-user-id", role: UserRole.LEADER };

  let controller: ShelteredController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [ShelteredController],
      providers: [
        { provide: CreateShelteredService, useValue: createShelteredService },
        { provide: GetShelteredService, useValue: getShelteredService },
        { provide: UpdateShelteredService, useValue: updateShelteredService },
        { provide: DeleteShelteredService, useValue: deleteShelteredService },
      ],
    }).compile();

    controller = moduleRef.get(ShelteredController);
  });

  it("is protected by the JWT guard", () => {
    const metadata: unknown = Reflect.getMetadata(
      "__guards__",
      ShelteredController,
    );
    const guards: unknown[] = Array.isArray(metadata) ? metadata : [];

    expect(guards).toContain(JwtAuthGuard);
  });

  it("delegates the paginated list with the actor taken from the request", async () => {
    const query = buildQueryShelteredDto();
    getShelteredService.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll(query, request);

    expect(getShelteredService.findAll).toHaveBeenCalledWith(
      query,
      expectedActor,
    );
  });

  it("delegates the simple list", async () => {
    const query = buildQueryShelteredSimpleDto();
    getShelteredService.findAllSimple.mockResolvedValue({ data: [], meta: {} });

    await controller.findAllSimple(query, request);

    expect(getShelteredService.findAllSimple).toHaveBeenCalledWith(
      query,
      expectedActor,
    );
  });

  it("delegates the detail lookup", async () => {
    getShelteredService.findOne.mockResolvedValue({ id: "sheltered-id" });

    await expect(
      controller.findOne("sheltered-id", request),
    ).resolves.toMatchObject({
      id: "sheltered-id",
    });
    expect(getShelteredService.findOne).toHaveBeenCalledWith(
      "sheltered-id",
      expectedActor,
    );
  });

  it("delegates the creation and returns the service response", async () => {
    const dto = buildCreateShelteredDto();
    createShelteredService.execute.mockResolvedValue({
      id: "sheltered-id",
      gender: ShelteredGender.FEMALE,
    });

    await expect(controller.create(dto, request)).resolves.toMatchObject({
      id: "sheltered-id",
    });
    expect(createShelteredService.execute).toHaveBeenCalledWith(
      dto,
      expectedActor,
    );
  });

  it("delegates the update", async () => {
    updateShelteredService.execute.mockResolvedValue({ id: "sheltered-id" });

    await controller.update("sheltered-id", { name: "Novo nome" }, request);

    expect(updateShelteredService.execute).toHaveBeenCalledWith(
      "sheltered-id",
      { name: "Novo nome" },
      expectedActor,
    );
  });

  it("unwraps the status DTO before delegating", async () => {
    updateShelteredService.updateStatus.mockResolvedValue({
      id: "sheltered-id",
    });

    await controller.updateStatus("sheltered-id", { active: false }, request);

    expect(updateShelteredService.updateStatus).toHaveBeenCalledWith(
      "sheltered-id",
      false,
      expectedActor,
    );
  });

  it("delegates the deletion and returns no content", async () => {
    deleteShelteredService.execute.mockResolvedValue(undefined);

    await expect(
      controller.remove("sheltered-id", request),
    ).resolves.toBeUndefined();
    expect(deleteShelteredService.execute).toHaveBeenCalledWith(
      "sheltered-id",
      expectedActor,
    );
  });

  it("falls back to an anonymous actor when the request carries no user", async () => {
    getShelteredService.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll(
      buildQueryShelteredDto(),
      {} as AuthenticatedRequest,
    );

    expect(getShelteredService.findAll).toHaveBeenCalledWith(
      expect.anything(),
      {
        userId: null,
        role: null,
      },
    );
  });
});
