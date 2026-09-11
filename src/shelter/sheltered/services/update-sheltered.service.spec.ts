import { Test } from "@nestjs/testing";
import { AddressesService } from "src/shelter/address/addresses.service";
import { ResourceNotFoundException } from "src/common/exceptions";
import { ShelteredRepository } from "../repositories/sheltered.repository";
import { UpdateShelteredService } from "./update-sheltered.service";
import { GetShelteredService } from "./get-sheltered.service";
import { ShelteredShelterAccessService } from "./sheltered-shelter-access.service";
import { ShelteredGender } from "../enums/sheltered-gender.enum";
import {
  buildAddressEntity,
  buildAdminContext,
  buildShelteredEntity,
} from "../sheltered.fixtures";

describe("UpdateShelteredService", () => {
  const repository = { save: jest.fn() };
  const getShelteredService = { findEntityOrFail: jest.fn() };
  const shelterAccessService = { assertReachable: jest.fn() };
  const addressesService = { create: jest.fn(), merge: jest.fn() };

  let service: UpdateShelteredService;

  const givenEntity = (entity = buildShelteredEntity()) => {
    getShelteredService.findEntityOrFail.mockResolvedValue(entity);
    return entity;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateShelteredService,
        { provide: ShelteredRepository, useValue: repository },
        { provide: GetShelteredService, useValue: getShelteredService },
        {
          provide: ShelteredShelterAccessService,
          useValue: shelterAccessService,
        },
        { provide: AddressesService, useValue: addressesService },
      ],
    }).compile();

    service = moduleRef.get(UpdateShelteredService);
    repository.save.mockResolvedValue(buildShelteredEntity());
    shelterAccessService.assertReachable.mockResolvedValue(undefined);
  });

  it("applies only the supplied scalar fields", async () => {
    const entity = givenEntity();

    await service.execute(
      "sheltered-id",
      { name: "Maria Souza", gender: ShelteredGender.MALE },
      buildAdminContext(),
    );

    expect(entity.name).toBe("Maria Souza");
    expect(entity.gender).toBe(ShelteredGender.MALE);
    expect(entity.guardianName).toBe("Joana Silva");
    expect(entity.joinedAt).toBe("2024-08-01");
  });

  it("normalizes date fields that are explicitly supplied", async () => {
    const entity = givenEntity();

    await service.execute(
      "sheltered-id",
      { birthDate: "2016-06-06T10:00:00.000Z" },
      buildAdminContext(),
    );

    expect(entity.birthDate).toBe("2016-06-06");
  });

  it("detaches the shelter when shelterId is explicitly null", async () => {
    const entity = givenEntity();

    await service.execute(
      "sheltered-id",
      { shelterId: null },
      buildAdminContext(),
    );

    expect(entity.shelter).toBeNull();
    expect(shelterAccessService.assertReachable).not.toHaveBeenCalled();
  });

  it("authorizes and links a new shelter", async () => {
    const entity = givenEntity();

    await service.execute(
      "sheltered-id",
      { shelterId: "other-shelter-id" },
      buildAdminContext(),
    );

    expect(shelterAccessService.assertReachable).toHaveBeenCalledWith(
      "other-shelter-id",
      buildAdminContext(),
    );
    expect(entity.shelter?.id).toBe("other-shelter-id");
  });

  it("rejects the whole update when the new shelter is out of scope", async () => {
    givenEntity();
    shelterAccessService.assertReachable.mockRejectedValue(
      new ResourceNotFoundException(
        "Abrigo não encontrado ou fora do seu acesso.",
      ),
    );

    await expect(
      service.execute(
        "sheltered-id",
        { shelterId: "other" },
        buildAdminContext(),
      ),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);

    expect(repository.save).not.toHaveBeenCalled();
  });

  it("merges into the existing address instead of creating a second one", async () => {
    const entity = givenEntity();

    await service.execute(
      "sheltered-id",
      { address: { city: "Belém" } },
      buildAdminContext(),
    );

    expect(addressesService.merge).toHaveBeenCalledWith(entity.address, {
      city: "Belém",
    });
    expect(addressesService.create).not.toHaveBeenCalled();
  });

  it("creates an address when the acolhido had none", async () => {
    const entity = givenEntity(buildShelteredEntity({ address: null }));
    const address = buildAddressEntity();
    addressesService.create.mockReturnValue(address);

    await service.execute(
      "sheltered-id",
      { address: { city: "Manaus", state: "AM" } },
      buildAdminContext(),
    );

    expect(entity.address).toBe(address);
  });

  it("detaches the address when it is explicitly null", async () => {
    const entity = givenEntity();

    await service.execute(
      "sheltered-id",
      { address: null },
      buildAdminContext(),
    );

    expect(entity.address).toBeNull();
  });

  it("leaves relations untouched when the keys are omitted", async () => {
    const entity = givenEntity();

    await service.execute(
      "sheltered-id",
      { name: "Outro nome" },
      buildAdminContext(),
    );

    expect(entity.shelter?.id).toBe("shelter-id");
    expect(entity.address?.id).toBe("address-id");
  });

  describe("updateStatus", () => {
    it("flips only the active flag", async () => {
      const entity = givenEntity();

      await service.updateStatus("sheltered-id", false, buildAdminContext());

      expect(entity.active).toBe(false);
      expect(entity.name).toBe("Maria Silva");
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it("propagates a 404 for an unknown or out-of-scope record", async () => {
      getShelteredService.findEntityOrFail.mockRejectedValue(
        new ResourceNotFoundException(
          "Acolhido não encontrado ou fora do seu acesso.",
        ),
      );

      await expect(
        service.updateStatus("sheltered-id", true, buildAdminContext()),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);

      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
