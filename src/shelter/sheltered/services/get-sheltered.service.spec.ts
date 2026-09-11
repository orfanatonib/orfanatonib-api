import { Test } from "@nestjs/testing";
import { HttpStatus } from "@nestjs/common";
import { ResourceNotFoundException } from "src/common/exceptions";
import { ShelteredRepository } from "../repositories/sheltered.repository";
import { GetShelteredService } from "./get-sheltered.service";
import { ShelteredOrderBy } from "../enums/sheltered-order-by.enum";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { AcceptedJesusFilter } from "../enums/accepted-jesus-filter.enum";
import { ShelteredActiveFilter } from "../enums/sheltered-active-filter.enum";
import {
  buildAdminContext,
  buildQueryShelteredDto,
  buildQueryShelteredSimpleDto,
  buildShelteredEntity,
} from "../sheltered.fixtures";

describe("GetShelteredService", () => {
  const repository = {
    findAllPaginated: jest.fn(),
    findAllSimple: jest.fn(),
    findOneForResponse: jest.fn(),
  };

  let service: GetShelteredService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        GetShelteredService,
        { provide: ShelteredRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(GetShelteredService);
  });

  describe("findAll", () => {
    it("maps the rows and computes the pagination meta", async () => {
      repository.findAllPaginated.mockResolvedValue({
        items: [buildShelteredEntity()],
        total: 41,
      });
      const query = buildQueryShelteredDto({ page: 2, limit: 20 });

      const result = await service.findAll(query, buildAdminContext());

      expect(repository.findAllPaginated).toHaveBeenCalledWith(
        query,
        buildAdminContext(),
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("sheltered-id");
      expect(result.meta).toEqual({
        page: 2,
        limit: 20,
        totalItems: 41,
        totalPages: 3,
        orderBy: ShelteredOrderBy.NAME,
        order: SortOrder.ASC,
      });
    });

    it("reports zero pages for an empty result set", async () => {
      repository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

      const result = await service.findAll(
        buildQueryShelteredDto(),
        buildAdminContext(),
      );

      expect(result.data).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe("findAllSimple", () => {
    it("forwards the filters and returns the list contract", async () => {
      repository.findAllSimple.mockResolvedValue({
        items: [buildShelteredEntity()],
        total: 1,
      });
      const query = buildQueryShelteredSimpleDto({
        searchString: "esperança",
        acceptedJesus: AcceptedJesusFilter.ACCEPTED,
        active: ShelteredActiveFilter.ACTIVE,
      });

      const result = await service.findAllSimple(query, buildAdminContext());

      expect(repository.findAllSimple).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 20,
          searchString: "esperança",
          acceptedJesus: AcceptedJesusFilter.ACCEPTED,
          active: ShelteredActiveFilter.ACTIVE,
        },
        buildAdminContext(),
      );
      expect(result.data[0]).toMatchObject({
        shelterId: "shelter-id",
        active: true,
      });
      expect(result.meta).not.toHaveProperty("orderBy");
    });
  });

  describe("findOne", () => {
    it("returns the mapped response when the record is visible", async () => {
      repository.findOneForResponse.mockResolvedValue(buildShelteredEntity());

      await expect(
        service.findOne("sheltered-id", buildAdminContext()),
      ).resolves.toMatchObject({ id: "sheltered-id" });
    });

    it("raises a 404 that does not reveal out-of-scope records", async () => {
      repository.findOneForResponse.mockResolvedValue(null);

      await expect(
        service.findOne("sheltered-id", buildAdminContext()),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);

      await expect(
        service
          .findOne("sheltered-id", buildAdminContext())
          .catch((error: ResourceNotFoundException) => error.getStatus()),
      ).resolves.toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe("findEntityOrFail", () => {
    it("returns the entity itself for the write use cases", async () => {
      const entity = buildShelteredEntity();
      repository.findOneForResponse.mockResolvedValue(entity);

      await expect(
        service.findEntityOrFail("sheltered-id", buildAdminContext()),
      ).resolves.toBe(entity);
    });
  });
});
