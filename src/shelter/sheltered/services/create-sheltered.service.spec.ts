import { Test } from "@nestjs/testing";
import { AddressesService } from "src/shelter/address/services/addresses.service";
import { ResourceNotFoundException } from "src/common/exceptions";
import { ShelteredEntity } from "../entities/sheltered.entity";
import { ShelteredRepository } from "../repositories/sheltered.repository";
import { CreateShelteredService } from "./create-sheltered.service";
import { GetShelteredService } from "./get-sheltered.service";
import { ShelteredShelterAccessService } from "./sheltered-shelter-access.service";
import { ShelteredGender } from "../enums/sheltered-gender.enum";
import {
  buildAddressEntity,
  buildAdminContext,
  buildCreateShelteredDto,
  buildShelteredEntity,
} from "../sheltered.fixtures";

describe("CreateShelteredService", () => {
  const repository = { create: jest.fn(), save: jest.fn() };
  const getShelteredService = { findEntityOrFail: jest.fn() };
  const shelterAccessService = { assertReachable: jest.fn() };
  const addressesService = { create: jest.fn() };

  let service: CreateShelteredService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateShelteredService,
        { provide: ShelteredRepository, useValue: repository },
        { provide: GetShelteredService, useValue: getShelteredService },
        {
          provide: ShelteredShelterAccessService,
          useValue: shelterAccessService,
        },
        { provide: AddressesService, useValue: addressesService },
      ],
    }).compile();

    service = moduleRef.get(CreateShelteredService);

    repository.create.mockImplementation((partial: Partial<ShelteredEntity>) =>
      Object.assign(buildShelteredEntity(), partial),
    );
    repository.save.mockResolvedValue(buildShelteredEntity());
    getShelteredService.findEntityOrFail.mockResolvedValue(
      buildShelteredEntity(),
    );
    shelterAccessService.assertReachable.mockResolvedValue(undefined);
  });

  it("authorizes the shelter link, persists once and returns the reloaded response", async () => {
    const dto = buildCreateShelteredDto();

    const result = await service.execute(dto, buildAdminContext());

    expect(shelterAccessService.assertReachable).toHaveBeenCalledWith(
      "shelter-id",
      buildAdminContext(),
    );
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(getShelteredService.findEntityOrFail).toHaveBeenCalledWith(
      "sheltered-id",
      buildAdminContext(),
    );
    expect(result).toMatchObject({
      id: "sheltered-id",
      gender: ShelteredGender.FEMALE,
    });
  });

  it("normalizes the date columns before persisting", async () => {
    await service.execute(
      buildCreateShelteredDto({
        birthDate: "2015-04-02T23:00:00.000Z",
        joinedAt: undefined,
      }),
      buildAdminContext(),
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ birthDate: "2015-04-02", joinedAt: null }),
    );
  });

  it("skips the shelter check and stores a null relation when no shelter is given", async () => {
    await service.execute(
      buildCreateShelteredDto({ shelterId: undefined }),
      buildAdminContext(),
    );

    expect(shelterAccessService.assertReachable).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ shelter: null }),
    );
  });

  it("attaches the address so it cascades within the same write", async () => {
    const address = buildAddressEntity();
    addressesService.create.mockReturnValue(address);

    await service.execute(
      buildCreateShelteredDto({ address: { city: "Manaus", state: "AM" } }),
      buildAdminContext(),
    );

    expect(addressesService.create).toHaveBeenCalledWith({
      city: "Manaus",
      state: "AM",
    });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ address }),
    );
  });

  it("does not persist anything when the shelter is out of scope", async () => {
    shelterAccessService.assertReachable.mockRejectedValue(
      new ResourceNotFoundException(
        "Abrigo não encontrado ou fora do seu acesso.",
      ),
    );

    await expect(
      service.execute(buildCreateShelteredDto(), buildAdminContext()),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);

    expect(repository.save).not.toHaveBeenCalled();
  });
});
