import { Test, TestingModule } from "@nestjs/testing";

import { ResourceNotFoundException } from "src/common/exceptions";
import { BadRequestException } from "@nestjs/common";

import { GetContentPackagesService } from "./get-content-packages.service";
import { QueryContentPackagesDto } from "../dto/query-content-packages.dto";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";

describe("GetContentPackagesService", () => {
  let service: GetContentPackagesService;
  let repository: jest.Mocked<ContentPackagesRepository>;

  beforeEach(async () => {
    const mockRepository = {
      findAllPaginated: jest.fn(),
      findByIdWithGraph: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetContentPackagesService,
        {
          provide: ContentPackagesRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<GetContentPackagesService>(GetContentPackagesService);
    repository = module.get(ContentPackagesRepository);
  });

  describe("findAll", () => {
    it("should return paginated packages from repository", async () => {
      const query: QueryContentPackagesDto = { page: 1, limit: 10 };
      const paginatedResult = {
        data: [new ContentPackageEntity()],
        total: 1,
        page: 1,
        limit: 10,
      };

      repository.findAllPaginated.mockResolvedValue(paginatedResult);

      const result = await service.findAll(query);

      expect(result).toBe(paginatedResult);
      expect(repository.findAllPaginated).toHaveBeenCalledWith(query);
    });

    it("should reject a reversed creation-date range", async () => {
      await expect(
        service.findAll({ startDate: "2026-10-02", endDate: "2026-10-01" }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.findAllPaginated).not.toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return package graph if found", async () => {
      const pkg = new ContentPackageEntity();
      pkg.id = "pkg-123";
      repository.findByIdWithGraph.mockResolvedValue(pkg);

      const result = await service.findOne("pkg-123");

      expect(result).toBe(pkg);
      expect(repository.findByIdWithGraph).toHaveBeenCalledWith("pkg-123");
    });

    it("should throw ResourceNotFoundException if package is not found", async () => {
      repository.findByIdWithGraph.mockResolvedValue(null);

      await expect(service.findOne("pkg-unknown")).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });
});
