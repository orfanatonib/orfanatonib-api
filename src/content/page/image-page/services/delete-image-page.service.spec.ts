import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { ImagePageRepository } from "../repositories/image-page.repository";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { DeleteImagePageService } from "./delete-image-page.service";

describe("DeleteImagePageService", () => {
  const PROTECTED = "feed-page";
  let runner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: { remove: jest.Mock };
  };
  let repo: { findByIdWithSections: jest.Mock };
  let route: { removeRoute: jest.Mock };
  let media: {
    findManyMediaItemsByTargets: jest.Mock;
    deleteMediaItems: jest.Mock;
  };
  let service: DeleteImagePageService;

  beforeEach(() => {
    runner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: { remove: jest.fn() },
    };
    repo = { findByIdWithSections: jest.fn() };
    route = { removeRoute: jest.fn() };
    media = {
      findManyMediaItemsByTargets: jest.fn().mockResolvedValue([{ id: "m" }]),
      deleteMediaItems: jest.fn(),
    };
    service = new DeleteImagePageService(
      { createQueryRunner: () => runner } as unknown as DataSource,
      repo as unknown as ImagePageRepository,
      route as unknown as RouteService,
      { delete: jest.fn() } as unknown as AwsS3Service,
      media as unknown as MediaItemProcessor,
      { get: () => PROTECTED } as unknown as ConfigService,
    );
  });

  it("a página protegida do feed nunca é excluída (403) e nem abre transação", async () => {
    await expect(service.removePage(PROTECTED)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(runner.connect).not.toHaveBeenCalled();
  });

  it("exclui mídia, rota e página e confirma a transação", async () => {
    repo.findByIdWithSections.mockResolvedValue({
      id: "p1",
      sections: [{ id: "s1" }],
      route: { id: "r1" },
    });
    await service.removePage("p1");
    expect(media.deleteMediaItems).toHaveBeenCalledTimes(1);
    expect(route.removeRoute).toHaveBeenCalledWith("r1");
    expect(runner.manager.remove).toHaveBeenCalled();
    expect(runner.commitTransaction).toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalled();
  });

  it("página inexistente: rollback e 400 padronizado, conexão liberada", async () => {
    repo.findByIdWithSections.mockResolvedValue(null);
    await expect(service.removePage("x")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(runner.rollbackTransaction).toHaveBeenCalled();
    expect(runner.commitTransaction).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalled();
  });
});
