import { BadRequestException, NotFoundException } from "@nestjs/common";
import { MeditationRepository } from "../meditation.repository";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { DeleteMeditationService } from "./delete-meditation.service";
import { GetMeditationService } from "./get-meditation.service";

describe("Meditation get/delete services", () => {
  let repo: {
    findOneWithRelations: jest.Mock;
    findAllWithRelations: jest.Mock;
    delete: jest.Mock;
  };
  let media: {
    findMediaItemsByTarget: jest.Mock;
    findMediaItemByTarget: jest.Mock;
    findManyMediaItemsByTargets: jest.Mock;
    removeMediaItemsKeepingFiles: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      findOneWithRelations: jest.fn(),
      findAllWithRelations: jest.fn(),
      delete: jest.fn(),
    };
    media = {
      findMediaItemsByTarget: jest.fn().mockResolvedValue([]),
      findMediaItemByTarget: jest.fn().mockResolvedValue(null),
      findManyMediaItemsByTargets: jest.fn().mockResolvedValue([]),
      removeMediaItemsKeepingFiles: jest.fn().mockResolvedValue([]),
    };
  });

  describe("GetMeditationService", () => {
    const build = () =>
      new GetMeditationService(
        repo as unknown as MeditationRepository,
        media as unknown as MediaItemProcessor,
      );

    it("findAll sem meditações não consulta mídia", async () => {
      repo.findAllWithRelations.mockResolvedValue([]);
      await expect(build().findAll()).resolves.toEqual([]);
      expect(media.findManyMediaItemsByTargets).not.toHaveBeenCalled();
    });

    it("findOne rejeita id vazio com 400", async () => {
      await expect(build().findOne("")).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repo.findOneWithRelations).not.toHaveBeenCalled();
    });

    it("findOne 404 quando não existe", async () => {
      repo.findOneWithRelations.mockResolvedValue(null);
      await expect(build().findOne("x")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("getThisWeekMeditation sem nenhuma meditação vigente devolve notFound", async () => {
      repo.findAllWithRelations.mockResolvedValue([
        { id: "m1", startDate: "2000-01-03", endDate: "2000-01-09" },
      ]);
      const result = await build().getThisWeekMeditation();
      expect(result.meditation).toBeNull();
    });
  });

  describe("DeleteMeditationService", () => {
    const build = () => {
      const storage = {
        deleteAfterCommit: jest.fn().mockResolvedValue(undefined),
      };
      const route = { removeRouteByEntity: jest.fn() };
      const service = new DeleteMeditationService(
        repo as unknown as MeditationRepository,
        storage as unknown as MediaStorageService,
        route as unknown as RouteService,
        media as unknown as MediaItemProcessor,
      );
      return { service, route, storage };
    };

    it("404 quando não existe e nada é apagado", async () => {
      repo.findOneWithRelations.mockResolvedValue(null);
      const { service, route } = build();
      await expect(service.remove("x")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(route.removeRouteByEntity).not.toHaveBeenCalled();
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it("remove mídia, rota e meditação", async () => {
      repo.findOneWithRelations.mockResolvedValue({ id: "m1" });
      media.findMediaItemsByTarget.mockResolvedValue([{ id: "x" }]);
      media.removeMediaItemsKeepingFiles.mockResolvedValue(["https://b/x.pdf"]);
      const { service, route, storage } = build();
      await service.remove("m1");
      expect(media.removeMediaItemsKeepingFiles).toHaveBeenCalledTimes(1);
      expect(storage.deleteAfterCommit).toHaveBeenCalledWith([
        "https://b/x.pdf",
      ]);
      expect(route.removeRouteByEntity).toHaveBeenCalledWith(
        MediaTargetType.Meditation,
        "m1",
      );
      expect(repo.delete).toHaveBeenCalledWith("m1");
    });

    it("[media-upload.legacy-update.meditation#delete-falha-no-banco] se apagar a meditação falha, nenhum objeto sai do bucket", async () => {
      repo.findOneWithRelations.mockResolvedValue({ id: "m1" });
      media.findMediaItemsByTarget.mockResolvedValue([{ id: "x" }]);
      media.removeMediaItemsKeepingFiles.mockResolvedValue(["https://b/x.pdf"]);
      repo.delete.mockRejectedValue(new Error("db"));
      const { service, storage } = build();
      await expect(service.remove("m1")).rejects.toThrow("db");
      expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
    });
  });
});
