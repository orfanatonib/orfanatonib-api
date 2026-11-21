import { NotFoundException } from "@nestjs/common";
import { VideosPageRepository } from "../repositories/video-page.repository";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { AuthContextService } from "src/core/auth/services/auth-context.service";
import { GetVideosPageService } from "./get-video-page.service";

describe("GetVideosPageService", () => {
  let repo: { findAll: jest.Mock; findById: jest.Mock };
  let media: {
    findManyMediaItemsByTargets: jest.Mock;
    findMediaItemsByTarget: jest.Mock;
  };
  let service: GetVideosPageService;
  const pages = [
    { id: "a", public: true, route: { id: "ra", path: "a" } },
    { id: "b", public: false, route: { id: "rb", path: "b" } },
  ];

  beforeEach(() => {
    repo = { findAll: jest.fn().mockResolvedValue(pages), findById: jest.fn() };
    media = {
      findManyMediaItemsByTargets: jest.fn().mockResolvedValue([]),
      findMediaItemsByTarget: jest.fn().mockResolvedValue([]),
    };
    service = new GetVideosPageService(
      repo as unknown as VideosPageRepository,
      media as unknown as MediaItemProcessor,
      {} as AuthContextService,
    );
  });

  it("visitante anônimo não consulta mídia de páginas não públicas", async () => {
    await service.findAll(false);
    expect(media.findManyMediaItemsByTargets).toHaveBeenCalledWith(
      ["a"],
      expect.anything(),
    );
  });

  it("logado vê todas", async () => {
    await service.findAll(true);
    expect(media.findManyMediaItemsByTargets).toHaveBeenCalledWith(
      ["a", "b"],
      expect.anything(),
    );
  });

  it("findOne de página não pública para anônimo é 404 (não vaza existência)", async () => {
    repo.findById.mockResolvedValue({ id: "b", public: false });
    await expect(service.findOne("b", false)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(media.findMediaItemsByTarget).not.toHaveBeenCalled();
  });

  it("findOne inexistente é 404", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findOne("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("mapeia as mídias para o DTO de saída, sem storageKey/targetId/targetType", async () => {
    repo.findById.mockResolvedValue({
      id: "a",
      name: "A",
      description: "d",
      public: true,
      route: { id: "ra", path: "a" },
    });
    media.findMediaItemsByTarget.mockResolvedValue([
      {
        id: "m1",
        title: "v",
        description: "d",
        mediaType: "video",
        uploadType: "upload",
        url: "https://x/v.mp4",
        isLocalFile: true,
        storageKey: "k/v.mp4",
        targetId: "a",
        targetType: "VideosPage",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const res = await service.findOne("a");
    expect(Object.keys(res.videos[0]).sort()).toEqual(
      [
        "createdAt",
        "description",
        "id",
        "isLocalFile",
        "mediaType",
        "originalName",
        "platformType",
        "size",
        "title",
        "updatedAt",
        "uploadType",
        "url",
      ].sort(),
    );
    expect(res.videos[0]).not.toHaveProperty("storageKey");
  });
});
