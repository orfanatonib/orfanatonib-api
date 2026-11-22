import { Test } from "@nestjs/testing";
import {
  ResourceNotFoundException,
  RuleException,
} from "src/common/exceptions";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import {
  MediaItemEntity,
  MediaType,
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
    removeMediaItemsKeepingFiles: jest.fn(),
  };
  const batch = {
    objects: [] as Array<{ key: string; url: string }>,
  };
  const mediaStorage = { uploadAll: jest.fn() };
  const unit = {
    manager: {} as never,
    batch: batch as never,
    obsoleteUrls: [] as string[],
  };

  let service: VisitMaterialMediaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        VisitMaterialMediaService,
        { provide: MediaItemProcessor, useValue: mediaItemProcessor },
        { provide: MediaStorageService, useValue: mediaStorage },
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
    mediaItemProcessor.removeMediaItemsKeepingFiles.mockImplementation(
      (items: MediaItemEntity[]) =>
        Promise.resolve(
          items.filter((i) => i.isLocalFile && i.url).map((i) => i.url),
        ),
    );
    batch.objects = [];
    unit.obsoleteUrls = [];
    mediaStorage.uploadAll.mockImplementation(() => {
      batch.objects.push({
        key: "local/VisitMaterialsPage/page-id/novo.pdf",
        url: "https://bucket.test/novo.pdf",
      });
      return Promise.resolve(batch);
    });
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

    it("rejects a link without a URL before opening a create transaction", () => {
      expect(() =>
        service.toPolymorphicItems(
          {
            videos: [buildLinkMediaDto({ url: undefined })],
            documents: [],
            images: [],
            audios: [],
          },
          {},
        ),
      ).toThrow(RuleException);
    });
  });

  describe("reconcile (edição transacional)", () => {
    const buckets = (
      over: Partial<Record<string, MediaItemEntity[] | unknown[]>> = {},
    ) => ({
      videos: [],
      documents: [],
      images: [],
      audios: [],
      ...over,
    });
    const givenStored = (items: MediaItemEntity[]) =>
      mediaItemProcessor.findMediaItemsByTarget.mockResolvedValue(items);

    it("drops the rows the payload no longer sends and defers their files to after the commit", async () => {
      const keep = buildMediaEntity({ id: "keep", mediaType: MediaType.VIDEO });
      const gone = buildMediaEntity({
        id: "gone",
        mediaType: MediaType.DOCUMENT,
        isLocalFile: true,
        url: "https://bucket.test/gone.pdf",
      });
      givenStored([keep, gone]);
      mediaItemProcessor.findMediaItemById.mockResolvedValue(keep);

      await service.reconcile(
        unit,
        "page-id",
        buckets({ videos: [buildLinkMediaDto({ id: "keep" })] }) as never,
        {},
      );

      expect(
        mediaItemProcessor.removeMediaItemsKeepingFiles,
      ).toHaveBeenCalledWith([gone], unit.manager);
      expect(unit.obsoleteUrls).toEqual(["https://bucket.test/gone.pdf"]);
    });

    it("stages a new upload in the batch and saves the row through the transaction manager", async () => {
      givenStored([]);
      const file = buildMulterFile();

      await service.reconcile(
        unit,
        "page-id",
        buckets({ documents: [buildUploadMediaDto()] }) as never,
        { "file-0": file },
      );

      expect(mediaStorage.uploadAll).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            file,
            mediaType: MediaType.DOCUMENT,
            entity: MediaTargetType.VisitMaterialsPage,
            ownerId: "page-id",
          }),
        ],
        batch,
      );
      expect(mediaItemProcessor.upsertMediaItem).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          url: "https://bucket.test/novo.pdf",
          storageKey: "local/VisitMaterialsPage/page-id/novo.pdf",
          isLocalFile: true,
          originalName: "material.pdf",
          platformType: undefined,
        }),
        unit.manager,
      );
      expect(unit.obsoleteUrls).toEqual([]);
    });

    it("replacing a stored file keeps the old one in the bucket until the commit", async () => {
      const stored = buildMediaEntity({
        id: "m1",
        mediaType: MediaType.DOCUMENT,
        uploadType: UploadType.UPLOAD,
        isLocalFile: true,
        url: "https://bucket.test/antigo.pdf",
      });
      givenStored([stored]);
      mediaItemProcessor.findMediaItemById.mockResolvedValue(stored);

      await service.reconcile(
        unit,
        "page-id",
        buckets({ documents: [buildUploadMediaDto({ id: "m1" })] }) as never,
        { "file-0": buildMulterFile() },
      );

      expect(unit.obsoleteUrls).toEqual(["https://bucket.test/antigo.pdf"]);
      expect(mediaItemProcessor.upsertMediaItem).toHaveBeenCalledWith(
        "m1",
        expect.objectContaining({ url: "https://bucket.test/novo.pdf" }),
        unit.manager,
      );
    });

    it("keeps a stored upload untouched when no replacement file is sent", async () => {
      const stored = buildMediaEntity({
        id: "m1",
        mediaType: MediaType.DOCUMENT,
        uploadType: UploadType.UPLOAD,
        isLocalFile: true,
        url: "https://bucket.test/antigo.pdf",
        originalName: "antigo.pdf",
        size: 10,
      });
      givenStored([stored]);
      mediaItemProcessor.findMediaItemById.mockResolvedValue(stored);

      await service.reconcile(
        unit,
        "page-id",
        buckets({
          documents: [buildUploadMediaDto({ id: "m1", fieldKey: undefined })],
        }) as never,
        {},
      );

      expect(mediaStorage.uploadAll).not.toHaveBeenCalled();
      expect(unit.obsoleteUrls).toEqual([]);
      expect(mediaItemProcessor.upsertMediaItem).toHaveBeenCalledWith(
        "m1",
        expect.objectContaining({ url: "https://bucket.test/antigo.pdf" }),
        unit.manager,
      );
    });

    it("switching an upload to a link defers the old file too", async () => {
      const stored = buildMediaEntity({
        id: "m1",
        mediaType: MediaType.DOCUMENT,
        isLocalFile: true,
        url: "https://bucket.test/antigo.pdf",
      });
      givenStored([stored]);
      mediaItemProcessor.findMediaItemById.mockResolvedValue(stored);

      await service.reconcile(
        unit,
        "page-id",
        buckets({
          documents: [
            buildLinkMediaDto({ id: "m1", mediaType: MediaType.DOCUMENT }),
          ],
        }) as never,
        {},
      );

      expect(unit.obsoleteUrls).toEqual(["https://bucket.test/antigo.pdf"]);
    });

    it("rejects an upload whose file did not arrive, before any write", async () => {
      givenStored([]);

      await expect(
        service.reconcile(
          unit,
          "page-id",
          buckets({ documents: [buildUploadMediaDto()] }) as never,
          {},
        ),
      ).rejects.toBeInstanceOf(RuleException);

      expect(mediaStorage.uploadAll).not.toHaveBeenCalled();
      expect(mediaItemProcessor.upsertMediaItem).not.toHaveBeenCalled();
    });

    it("rejects an upload without a fieldKey and a link without url", async () => {
      givenStored([]);

      await expect(
        service.reconcile(
          unit,
          "page-id",
          buckets({
            documents: [buildUploadMediaDto({ fieldKey: undefined })],
          }) as never,
          {},
        ),
      ).rejects.toBeInstanceOf(RuleException);
      await expect(
        service.reconcile(
          unit,
          "page-id",
          buckets({ videos: [buildLinkMediaDto({ url: "  " })] }) as never,
          {},
        ),
      ).rejects.toBeInstanceOf(RuleException);
    });

    it("rejects a media id owned by another page", async () => {
      givenStored([]);
      mediaItemProcessor.findMediaItemById.mockResolvedValue(
        buildMediaEntity({ id: "m1", targetId: "outra-pagina" }),
      );

      await expect(
        service.reconcile(
          unit,
          "page-id",
          buckets({ videos: [buildLinkMediaDto({ id: "m1" })] }) as never,
          {},
        ),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);
    });

    it("keeps the bucket authoritative over a mediaType sent by the client", async () => {
      givenStored([]);

      await service.reconcile(
        unit,
        "page-id",
        buckets({
          videos: [buildLinkMediaDto({ mediaType: MediaType.DOCUMENT })],
        }) as never,
        {},
      );

      expect(mediaItemProcessor.upsertMediaItem).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ mediaType: MediaType.VIDEO }),
        unit.manager,
      );
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
