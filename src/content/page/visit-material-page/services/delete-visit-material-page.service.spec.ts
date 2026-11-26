import { Test } from "@nestjs/testing";
import { EntityManager } from "typeorm";
import {
  ProcessException,
  ResourceNotFoundException,
} from "src/common/exceptions";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { DeleteVisitMaterialPageService } from "./delete-visit-material-page.service";
import { GetVisitMaterialPageService } from "./get-visit-material-page.service";
import { VisitMaterialMediaService } from "./visit-material-media.service";
import { VisitMaterialSectionsService } from "./visit-material-sections.service";
import { VisitMaterialsPageRepository } from "../repositories/visit-material-page.repository";
import {
  buildMediaEntity,
  buildPageEntity,
  buildRouteEntity,
} from "../visit-material-page.fixtures";

describe("DeleteVisitMaterialPageService", () => {
  const manager = {} as EntityManager;
  const repository = { remove: jest.fn(), runInTransaction: jest.fn() };
  const getService = { findEntityOrFail: jest.fn() };
  const mediaService = { findAllByPage: jest.fn() };
  const mediaItemProcessor = { deleteMediaItems: jest.fn() };
  const routeService = { findById: jest.fn(), removeRoute: jest.fn() };
  const s3 = { delete: jest.fn() };

  const sectionsService = {
    prepare: jest.fn().mockReturnValue([]),
    createAll: jest.fn().mockResolvedValue([]),
    sync: jest.fn().mockResolvedValue(undefined),
    loadForPage: jest.fn().mockResolvedValue([]),
    loadForPages: jest.fn().mockResolvedValue(new Map()),
    removeAllMedia: jest.fn().mockResolvedValue(undefined),
  };

  let service: DeleteVisitMaterialPageService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeleteVisitMaterialPageService,
        { provide: VisitMaterialsPageRepository, useValue: repository },
        { provide: VisitMaterialSectionsService, useValue: sectionsService },
        { provide: GetVisitMaterialPageService, useValue: getService },
        { provide: VisitMaterialMediaService, useValue: mediaService },
        { provide: MediaItemProcessor, useValue: mediaItemProcessor },
        { provide: RouteService, useValue: routeService },
        { provide: AwsS3Service, useValue: s3 },
      ],
    }).compile();

    service = moduleRef.get(DeleteVisitMaterialPageService);

    repository.runInTransaction.mockImplementation(
      (work: (m: EntityManager) => Promise<unknown>) => work(manager),
    );
    getService.findEntityOrFail.mockResolvedValue(buildPageEntity());
    mediaService.findAllByPage.mockResolvedValue([]);
    routeService.findById.mockResolvedValue(buildRouteEntity());
  });

  it("removes the media, the route and the page", async () => {
    const media = [buildMediaEntity()];
    mediaService.findAllByPage.mockResolvedValue(media);

    await service.execute("page-id");

    expect(mediaItemProcessor.deleteMediaItems).toHaveBeenCalledWith(
      media,
      expect.any(Function),
    );
    expect(routeService.removeRoute).toHaveBeenCalledWith("route-id");
    expect(repository.remove).toHaveBeenCalledWith(expect.anything(), manager);
  });

  it("skips the media cleanup when the page has none", async () => {
    await service.execute("page-id");

    expect(mediaItemProcessor.deleteMediaItems).not.toHaveBeenCalled();
    expect(repository.remove).toHaveBeenCalled();
  });

  it("does not try to remove a route that no longer exists", async () => {
    routeService.findById.mockResolvedValue(null);

    await service.execute("page-id");

    expect(routeService.removeRoute).not.toHaveBeenCalled();
    expect(repository.remove).toHaveBeenCalled();
  });

  it("keeps a missing page as a 404 instead of a generic failure", async () => {
    getService.findEntityOrFail.mockRejectedValue(
      new ResourceNotFoundException("Página de materiais não encontrada."),
    );

    await expect(service.execute("page-id")).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
    expect(repository.runInTransaction).not.toHaveBeenCalled();
  });

  it("skips the route lookup when the page has no route attached", async () => {
    const page = buildPageEntity();
    Reflect.deleteProperty(page, "route");
    getService.findEntityOrFail.mockResolvedValue(page);

    await service.execute("page-id");

    expect(routeService.findById).not.toHaveBeenCalled();
    expect(repository.remove).toHaveBeenCalled();
  });

  it("wraps an unexpected failure as a process error", async () => {
    repository.remove.mockRejectedValue(new Error("connection lost"));

    await expect(service.execute("page-id")).rejects.toBeInstanceOf(
      ProcessException,
    );
  });
});
