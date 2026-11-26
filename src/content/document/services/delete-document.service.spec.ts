import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { DeleteDocumentService } from "./delete-document.service";
import { DocumentRepository } from "../document.repository";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";

describe("DeleteDocumentService", () => {
  const doc = { id: "d1" };
  let repo: { findOneById: jest.Mock; remove: jest.Mock };
  let s3: { delete: jest.Mock };
  let route: { removeRouteByEntity: jest.Mock };
  let media: { findMediaItemsByTarget: jest.Mock; deleteMediaItems: jest.Mock };
  let service: DeleteDocumentService;

  beforeEach(() => {
    repo = { findOneById: jest.fn().mockResolvedValue(doc), remove: jest.fn() };
    s3 = { delete: jest.fn() };
    route = { removeRouteByEntity: jest.fn() };
    media = {
      findMediaItemsByTarget: jest.fn().mockResolvedValue([{ id: "m1" }]),
      deleteMediaItems: jest.fn(),
    };
    service = new DeleteDocumentService(
      repo as unknown as DocumentRepository,
      s3 as unknown as AwsS3Service,
      route as unknown as RouteService,
      media as unknown as MediaItemProcessor,
    );
  });

  it("remove mídia, documento e rota", async () => {
    await service.execute("d1");
    expect(media.deleteMediaItems).toHaveBeenCalledTimes(1);
    expect(repo.remove).toHaveBeenCalledWith(doc);
    expect(route.removeRouteByEntity).toHaveBeenCalledWith(
      MediaTargetType.Document,
      "d1",
    );
  });

  it("não chama o processador de mídia quando não há itens", async () => {
    media.findMediaItemsByTarget.mockResolvedValue([]);
    await service.execute("d1");
    expect(media.deleteMediaItems).not.toHaveBeenCalled();
    expect(repo.remove).toHaveBeenCalled();
  });

  it("404 quando o documento não existe, sem tocar em mídia", async () => {
    repo.findOneById.mockResolvedValue(null);
    await expect(service.execute("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(media.findMediaItemsByTarget).not.toHaveBeenCalled();
  });

  it("falha ao remover vira 500 padronizado", async () => {
    repo.remove.mockRejectedValue(new Error("db"));
    await expect(service.execute("d1")).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
