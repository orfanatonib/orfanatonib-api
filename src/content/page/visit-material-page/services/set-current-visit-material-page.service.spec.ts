import { Test } from "@nestjs/testing";
import { EntityManager } from "typeorm";
import { ResourceNotFoundException } from "src/common/exceptions";
import { SetCurrentVisitMaterialPageService } from "./set-current-visit-material-page.service";
import { GetVisitMaterialPageService } from "./get-visit-material-page.service";
import { VisitMaterialsPageRepository } from "../repositories/visit-material-page.repository";
import {
  buildPageEntity,
  buildRouteEntity,
} from "../visit-material-page.fixtures";

describe("SetCurrentVisitMaterialPageService", () => {
  const manager = {} as EntityManager;
  const repository = {
    findCurrentWeek: jest.fn(),
    save: jest.fn(),
    runInTransaction: jest.fn(),
  };
  const getService = { findEntityOrFail: jest.fn(), findOne: jest.fn() };

  let service: SetCurrentVisitMaterialPageService;

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.runInTransaction.mockImplementation(
      (work: (m: EntityManager) => Promise<unknown>) => work(manager),
    );
    repository.save.mockImplementation((page: unknown) =>
      Promise.resolve(page),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        SetCurrentVisitMaterialPageService,
        { provide: VisitMaterialsPageRepository, useValue: repository },
        { provide: GetVisitMaterialPageService, useValue: getService },
      ],
    }).compile();

    service = moduleRef.get(SetCurrentVisitMaterialPageService);
  });

  it("promotes the page and publishes its route", async () => {
    const page = buildPageEntity({
      currentWeek: false,
      route: buildRouteEntity({ public: false }),
    });
    getService.findEntityOrFail.mockResolvedValue(page);
    repository.findCurrentWeek.mockResolvedValue(null);

    await service.execute("page-id");

    expect(page.currentWeek).toBe(true);
    expect(page.route.current).toBe(true);
    expect(page.route.public).toBe(true);
    expect(repository.save).toHaveBeenCalledWith(page, manager);
  });

  it("demotes the previous current page in the same transaction", async () => {
    const page = buildPageEntity({ id: "new-page" });
    const previous = buildPageEntity({
      id: "old-page",
      currentWeek: true,
      route: buildRouteEntity({ id: "old-route", current: true }),
    });
    getService.findEntityOrFail.mockResolvedValue(page);
    repository.findCurrentWeek.mockResolvedValue(previous);

    await service.execute("new-page");

    expect(previous.currentWeek).toBe(false);
    expect(previous.route.current).toBe(false);
    expect(repository.runInTransaction).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledTimes(2);
  });

  it("does not demote the page it is promoting", async () => {
    const page = buildPageEntity({ id: "page-id", currentWeek: true });
    getService.findEntityOrFail.mockResolvedValue(page);
    repository.findCurrentWeek.mockResolvedValue(page);

    await service.execute("page-id");

    expect(page.currentWeek).toBe(true);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it("never writes when the page does not exist", async () => {
    getService.findEntityOrFail.mockRejectedValue(
      new ResourceNotFoundException("Página de materiais não encontrada."),
    );

    await expect(service.execute("page-id")).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
    expect(repository.runInTransaction).not.toHaveBeenCalled();
  });
});
