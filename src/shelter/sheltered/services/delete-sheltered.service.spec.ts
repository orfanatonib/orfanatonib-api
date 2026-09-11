import { Test } from "@nestjs/testing";
import { ResourceNotFoundException } from "src/common/exceptions";
import { ShelteredRepository } from "../repositories/sheltered.repository";
import { DeleteShelteredService } from "./delete-sheltered.service";
import { GetShelteredService } from "./get-sheltered.service";
import { buildAdminContext, buildShelteredEntity } from "../sheltered.fixtures";

describe("DeleteShelteredService", () => {
  const repository = { deleteById: jest.fn() };
  const getShelteredService = { findEntityOrFail: jest.fn() };

  let service: DeleteShelteredService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeleteShelteredService,
        { provide: ShelteredRepository, useValue: repository },
        { provide: GetShelteredService, useValue: getShelteredService },
      ],
    }).compile();

    service = moduleRef.get(DeleteShelteredService);
  });

  it("deletes only after confirming the record is visible to the actor", async () => {
    getShelteredService.findEntityOrFail.mockResolvedValue(
      buildShelteredEntity(),
    );

    await expect(
      service.execute("sheltered-id", buildAdminContext()),
    ).resolves.toBeUndefined();

    expect(getShelteredService.findEntityOrFail).toHaveBeenCalledWith(
      "sheltered-id",
      buildAdminContext(),
    );
    expect(repository.deleteById).toHaveBeenCalledWith("sheltered-id");
  });

  it("never deletes a record the actor cannot see", async () => {
    getShelteredService.findEntityOrFail.mockRejectedValue(
      new ResourceNotFoundException(
        "Acolhido não encontrado ou fora do seu acesso.",
      ),
    );

    await expect(
      service.execute("sheltered-id", buildAdminContext()),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);

    expect(repository.deleteById).not.toHaveBeenCalled();
  });
});
