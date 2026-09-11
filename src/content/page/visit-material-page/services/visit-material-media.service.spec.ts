import { Test } from "@nestjs/testing";
import { RuleException } from "src/common/exceptions";
import { AwsS3Service } from "src/infrastructure/aws/aws-s3.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import {
  MediaItemEntity,
  MediaType,
  PlatformType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { VisitMaterialMediaService } from "./visit-material-media.service";
import {
  buildLinkMediaDto,
  buildMediaEntity,
  buildMulterFile,
  buildUploadMediaDto,
} from "../visit-material-page.fixtures";

describe("VisitMaterialMediaService", () => {
  const mediaItemProcessor = {
    findMediaItemsByTarget: jest.fn(),
    findMediaItemById: jest.fn(),
    buildBaseMediaItem: jest.fn(),
    saveMediaItem: jest.fn(),
    upsertMediaItem: jest.fn(),
    deleteMediaItems: jest.fn(),
  };
  const s3 = { upload: jest.fn(), delete: jest.fn() };

  let service: VisitMaterialMediaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        VisitMaterialMediaService,
        { provide: MediaItemProcessor, useValue: mediaItemProcessor },
        { provide: AwsS3Service, useValue: s3 },
      ],
    }).compile();

    service = moduleRef.get(VisitMaterialMediaService);

    // The real processor copies the input onto a fresh entity.
    mediaItemProcessor.buildBaseMediaItem.mockImplementation(
      (item: Partial<MediaItemEntity>, targetId: string, targetType: string) =>
        Object.assign(new MediaItemEntity(), item, { targetId, targetType }),
    );
    mediaItemProcessor.saveMediaItem.mockImplementation(
      (media: MediaItemEntity) => media,
    );
    mediaItemProcessor.upsertMediaItem.mockImplementation(
      (_id: string | undefined, media: MediaItemEntity) => media,
    );
    mediaItemProcessor.findMediaItemById.mockResolvedValue(null);
    s3.upload.mockResolvedValue("https://bucket.test/uploaded.pdf");
  });

  describe("findGroupedByPage", () => {
    it("groups the stored media with a single query", async () => {
      mediaItemProcessor.findMediaItemsByTarget.mockResolvedValue([
        buildMediaEntity({ id: "v1", mediaType: MediaType.VIDEO }),
        buildMediaEntity({ id: "a1", mediaType: MediaType.AUDIO }),
        buildMediaEntity({ id: "v2", mediaType: MediaType.VIDEO }),
      ]);

      const grouped = await service.findGroupedByPage("page-id");

      expect(mediaItemProcessor.findMediaItemsByTarget).toHaveBeenCalledTimes(
        1,
      );
      expect(mediaItemProcessor.findMediaItemsByTarget).toHaveBeenCalledWith(
        "page-id",
        MediaTargetType.VisitMaterialsPage,
      );
      expect(grouped.get(MediaType.VIDEO)?.map((item) => item.id)).toEqual([
        "v1",
        "v2",
      ]);
      expect(grouped.get(MediaType.AUDIO)?.map((item) => item.id)).toEqual([
        "a1",
      ]);
      expect(grouped.get(MediaType.IMAGE)).toEqual([]);
      expect(grouped.get(MediaType.DOCUMENT)).toEqual([]);
    });
  });

  describe("toPolymorphicItems", () => {
    it("stamps each item with the media type of its bucket", () => {
      const items = service.toPolymorphicItems(
        {
          videos: [buildLinkMediaDto()],
          documents: [buildLinkMediaDto()],
          images: [buildLinkMediaDto()],
          audios: [buildLinkMediaDto()],
        },
        {},
      );

      expect(items.map((item) => item.mediaType)).toEqual([
        MediaType.VIDEO,
        MediaType.DOCUMENT,
        MediaType.IMAGE,
        MediaType.AUDIO,
      ]);
    });

    it("carries the upload field only for uploads", () => {
      const items = service.toPolymorphicItems(
        {
          videos: [buildLinkMediaDto()],
          documents: [buildUploadMediaDto({ fieldKey: "file-9" })],
          images: [],
          audios: [],
        },
        { "file-9": buildMulterFile({ fieldname: "file-9" }) },
      );

      expect(items[0].fileField).toBeUndefined();
      expect(items[1].fileField).toBe("file-9");
    });

    it("rejects an upload without its fieldKey", () => {
      expect(() =>
        service.toPolymorphicItems(
          {
            videos: [],
            documents: [buildUploadMediaDto({ fieldKey: undefined })],
            images: [],
            audios: [],
          },
          {},
        ),
      ).toThrow(RuleException);
    });
  });

  describe("toPolymorphicItems — arquivo ausente", () => {
    it("rejects an upload whose file did not arrive, as a client error", () => {
      expect(() =>
        service.toPolymorphicItems(
          {
            videos: [],
            documents: [buildUploadMediaDto({ fieldKey: "file-0" })],
            images: [],
            audios: [],
          },
          {},
        ),
      ).toThrow(RuleException);
    });

    it("accepts the upload when the file is present", () => {
      expect(() =>
        service.toPolymorphicItems(
          {
            videos: [],
            documents: [buildUploadMediaDto({ fieldKey: "file-0" })],
            images: [],
            audios: [],
          },
          { "file-0": buildMulterFile() },
        ),
      ).not.toThrow();
    });
  });

  describe("removeMissing", () => {
    it("deletes only the stored items the payload dropped", async () => {
      const kept = buildMediaEntity({ id: "kept" });
      const dropped = buildMediaEntity({ id: "dropped" });

      await service.removeMissing(
        [kept, dropped],
        [buildLinkMediaDto({ id: "kept" })],
      );

      expect(mediaItemProcessor.deleteMediaItems).toHaveBeenCalledWith(
        [dropped],
        expect.any(Function),
      );
    });

    it("does not call the processor when nothing was dropped", async () => {
      const kept = buildMediaEntity({ id: "kept" });

      await service.removeMissing([kept], [buildLinkMediaDto({ id: "kept" })]);

      expect(mediaItemProcessor.deleteMediaItems).not.toHaveBeenCalled();
    });

    it("deletes everything when the payload sends an empty bucket", async () => {
      const stored = [
        buildMediaEntity({ id: "a" }),
        buildMediaEntity({ id: "b" }),
      ];

      await service.removeMissing(stored, []);

      expect(mediaItemProcessor.deleteMediaItems).toHaveBeenCalledWith(
        stored,
        expect.any(Function),
      );
    });
  });

  describe("add", () => {
    it.each([
      [MediaType.VIDEO],
      [MediaType.DOCUMENT],
      [MediaType.IMAGE],
      [MediaType.AUDIO],
    ])("uploads and persists a %s the same way", async (mediaType) => {
      const file = buildMulterFile();

      const media = await service.add(
        buildUploadMediaDto(),
        "page-id",
        mediaType,
        { "file-0": file },
      );

      expect(s3.upload).toHaveBeenCalledWith(file);
      expect(media).toMatchObject({
        mediaType,
        url: "https://bucket.test/uploaded.pdf",
        // Stored in our bucket, so it is local whatever the payload claimed.
        isLocalFile: true,
        originalName: "material.pdf",
        size: 2048,
        platformType: undefined,
        targetId: "page-id",
        targetType: MediaTargetType.VisitMaterialsPage,
      });
    });

    it("treats an item flagged as local as an upload even without the upload type", async () => {
      await service.add(
        buildLinkMediaDto({ isLocalFile: true, fieldKey: "file-0" }),
        "page-id",
        MediaType.VIDEO,
        { "file-0": buildMulterFile() },
      );

      expect(s3.upload).toHaveBeenCalled();
    });

    it("keeps a link untouched and marks it as not local", async () => {
      const media = await service.add(
        buildLinkMediaDto({ url: "  https://youtube.test/v  " }),
        "page-id",
        MediaType.VIDEO,
        {},
      );

      expect(s3.upload).not.toHaveBeenCalled();
      expect(media).toMatchObject({
        url: "https://youtube.test/v",
        isLocalFile: false,
        platformType: PlatformType.YOUTUBE,
      });
    });

    it("keeps the bucket authoritative over a mediaType sent by the client", async () => {
      const media = await service.add(
        buildLinkMediaDto({ mediaType: MediaType.IMAGE }),
        "page-id",
        MediaType.VIDEO,
        {},
      );

      expect(media.mediaType).toBe(MediaType.VIDEO);
    });

    it("rejects an upload whose file did not arrive", async () => {
      await expect(
        service.add(buildUploadMediaDto(), "page-id", MediaType.DOCUMENT, {}),
      ).rejects.toBeInstanceOf(RuleException);

      expect(mediaItemProcessor.saveMediaItem).not.toHaveBeenCalled();
    });

    it("rejects an upload without a fieldKey", async () => {
      await expect(
        service.add(
          buildUploadMediaDto({ fieldKey: undefined }),
          "page-id",
          MediaType.DOCUMENT,
          {},
        ),
      ).rejects.toBeInstanceOf(RuleException);
    });
  });

  describe("upsert", () => {
    it("replaces the previous file when a new one is uploaded", async () => {
      mediaItemProcessor.findMediaItemById.mockResolvedValue(
        buildMediaEntity({
          id: "media-id",
          isLocalFile: true,
          url: "https://bucket.test/old.pdf",
        }),
      );

      await service.upsert(
        buildUploadMediaDto({ id: "media-id" }),
        "page-id",
        MediaType.DOCUMENT,
        { "file-0": buildMulterFile() },
      );

      expect(s3.delete).toHaveBeenCalledWith("https://bucket.test/old.pdf");
      expect(mediaItemProcessor.upsertMediaItem).toHaveBeenCalledWith(
        "media-id",
        expect.objectContaining({ url: "https://bucket.test/uploaded.pdf" }),
      );
    });

    it("does not delete anything when the stored item was already a link", async () => {
      mediaItemProcessor.findMediaItemById.mockResolvedValue(
        buildMediaEntity({ id: "media-id", isLocalFile: false }),
      );

      await service.upsert(
        buildUploadMediaDto({ id: "media-id" }),
        "page-id",
        MediaType.DOCUMENT,
        { "file-0": buildMulterFile() },
      );

      expect(s3.delete).not.toHaveBeenCalled();
    });

    it("cleans up the old file when the item switches to a link", async () => {
      mediaItemProcessor.findMediaItemById.mockResolvedValue(
        buildMediaEntity({
          id: "media-id",
          isLocalFile: true,
          url: "https://bucket.test/old.pdf",
        }),
      );

      const media = await service.upsert(
        buildLinkMediaDto({ id: "media-id" }),
        "page-id",
        MediaType.VIDEO,
        {},
      );

      expect(s3.delete).toHaveBeenCalledWith("https://bucket.test/old.pdf");
      expect(media.isLocalFile).toBe(false);
    });

    it("still updates the item when deleting the old file fails", async () => {
      mediaItemProcessor.findMediaItemById.mockResolvedValue(
        buildMediaEntity({
          id: "media-id",
          isLocalFile: true,
          url: "https://bucket.test/old.pdf",
        }),
      );
      s3.delete.mockRejectedValueOnce(new Error("S3 unavailable"));

      await expect(
        service.upsert(
          buildLinkMediaDto({ id: "media-id" }),
          "page-id",
          MediaType.VIDEO,
          {},
        ),
      ).resolves.toMatchObject({ isLocalFile: false });

      expect(mediaItemProcessor.upsertMediaItem).toHaveBeenCalled();
    });

    it("does not look the item up when the payload carries no id", async () => {
      await service.upsert(
        buildLinkMediaDto({ id: undefined }),
        "page-id",
        MediaType.VIDEO,
        {},
      );

      expect(mediaItemProcessor.findMediaItemById).not.toHaveBeenCalled();
      expect(mediaItemProcessor.upsertMediaItem).toHaveBeenCalledWith(
        undefined,
        expect.any(MediaItemEntity),
      );
    });

    it("treats an upload without a fieldKey as a link, as the previous code did", async () => {
      const media = await service.upsert(
        buildUploadMediaDto({
          id: "media-id",
          fieldKey: undefined,
          url: "https://link.test/a",
        }),
        "page-id",
        MediaType.DOCUMENT,
        {},
      );

      expect(s3.upload).not.toHaveBeenCalled();
      expect(media).toMatchObject({
        url: "https://link.test/a",
        isLocalFile: false,
      });
    });
  });

  describe("link fallbacks", () => {
    it("keeps the values already built when the payload omits the optional fields", async () => {
      const input = buildLinkMediaDto({
        title: undefined,
        description: undefined,
        uploadType: undefined as unknown as UploadType,
        platformType: undefined,
        url: undefined,
        originalName: undefined,
        size: undefined,
      });
      // The processor already copied whatever the payload carried; the overlay
      // must not blank those fields out.
      mediaItemProcessor.buildBaseMediaItem.mockReturnValue(
        Object.assign(new MediaItemEntity(), {
          title: "Título base",
          description: "Descrição base",
          uploadType: UploadType.LINK,
          platformType: PlatformType.YOUTUBE,
          url: "https://base.test/a",
          originalName: "base.mp4",
          size: 10,
        }),
      );

      const media = await service.add(input, "page-id", MediaType.VIDEO, {});

      expect(media).toMatchObject({
        title: "Título base",
        description: "Descrição base",
        uploadType: UploadType.LINK,
        platformType: PlatformType.YOUTUBE,
        url: "https://base.test/a",
        originalName: "base.mp4",
        size: 10,
        isLocalFile: false,
      });
    });

    it("overrides the built values when the payload carries them", async () => {
      mediaItemProcessor.buildBaseMediaItem.mockReturnValue(
        Object.assign(new MediaItemEntity(), { title: "Título base" }),
      );

      const media = await service.add(
        buildLinkMediaDto({
          title: "Título do payload",
          description: "Descrição do payload",
          originalName: "payload.mp4",
          size: 99,
        }),
        "page-id",
        MediaType.VIDEO,
        {},
      );

      expect(media).toMatchObject({
        title: "Título do payload",
        description: "Descrição do payload",
        originalName: "payload.mp4",
        size: 99,
      });
    });

    it("names the item in the error even when it has no title", async () => {
      await expect(
        service.add(
          buildUploadMediaDto({ title: undefined, fieldKey: undefined }),
          "page-id",
          MediaType.DOCUMENT,
          {},
        ),
      ).rejects.toBeInstanceOf(RuleException);

      expect(() =>
        service.toPolymorphicItems(
          {
            videos: [],
            documents: [
              buildUploadMediaDto({ title: undefined, fieldKey: undefined }),
            ],
            images: [],
            audios: [],
          },
          {},
        ),
      ).toThrow(RuleException);
    });

    it("does not clean up when the stored item has no url", async () => {
      mediaItemProcessor.findMediaItemById.mockResolvedValue(
        buildMediaEntity({ id: "media-id", isLocalFile: true, url: "" }),
      );

      await service.upsert(
        buildLinkMediaDto({ id: "media-id" }),
        "page-id",
        MediaType.VIDEO,
        {},
      );

      expect(s3.delete).not.toHaveBeenCalled();
    });

    it("does not clean up when the item stays local", async () => {
      mediaItemProcessor.findMediaItemById.mockResolvedValue(
        buildMediaEntity({
          id: "media-id",
          isLocalFile: true,
          url: "https://bucket.test/a",
        }),
      );

      await service.upsert(
        buildLinkMediaDto({
          id: "media-id",
          isLocalFile: true,
          fieldKey: undefined,
        }),
        "page-id",
        MediaType.VIDEO,
        {},
      );

      expect(s3.delete).not.toHaveBeenCalled();
    });
  });

  describe("toEntries", () => {
    it("exposes the buckets in the documented order", () => {
      const entries = VisitMaterialMediaService.toEntries({
        videos: [],
        documents: [],
        images: [],
        audios: [],
      });

      expect(entries.map(([mediaType]) => mediaType)).toEqual([
        MediaType.VIDEO,
        MediaType.DOCUMENT,
        MediaType.IMAGE,
        MediaType.AUDIO,
      ]);
    });
  });
});
