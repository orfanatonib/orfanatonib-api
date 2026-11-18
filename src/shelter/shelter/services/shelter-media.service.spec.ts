import { Test } from "@nestjs/testing";
import { RuleException } from "src/common/exceptions";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import {
  MediaItemEntity,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { ShelterMediaService } from "./shelter-media.service";
import {
  SHELTER_MEDIA_DEFAULT_DESCRIPTION,
  SHELTER_MEDIA_DEFAULT_TITLE,
  SHELTER_MEDIA_TARGET,
  SHELTER_MESSAGES,
  USER_MEDIA_TARGET,
} from "../constants";
import {
  buildLeaderProfile,
  buildMediaItem,
  buildMemberProfile,
  buildShelterEntity,
  buildTeamEntity,
  buildUploadedFile,
  buildUserEntity,
} from "../shelter.fixtures";

describe("ShelterMediaService", () => {
  const mediaItemProcessor = {
    findManyMediaItemsByTargets: jest.fn(),
    findMediaItemByTarget: jest.fn(),
    findMediaItemsByTarget: jest.fn(),
    buildBaseMediaItem: jest.fn(),
    saveMediaItem: jest.fn(),
    upsertMediaItem: jest.fn(),
    removeMediaItemsKeepingFiles: jest.fn(),
  };
  const batch = {
    objects: [] as Array<{ key: string; url: string }>,
    discard: jest.fn(),
    commit: jest.fn(),
  };
  const mediaStorage = {
    newBatch: jest.fn(() => batch),
    uploadAll: jest.fn(),
    deleteAfterCommit: jest.fn(),
  };

  let service: ShelterMediaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ShelterMediaService,
        { provide: MediaItemProcessor, useValue: mediaItemProcessor },
        { provide: MediaStorageService, useValue: mediaStorage },
      ],
    }).compile();
    moduleRef.useLogger(false);

    service = moduleRef.get(ShelterMediaService);

    mediaItemProcessor.findManyMediaItemsByTargets.mockResolvedValue([]);
    mediaItemProcessor.findMediaItemsByTarget.mockResolvedValue([]);
    mediaItemProcessor.findMediaItemByTarget.mockResolvedValue(null);
    mediaItemProcessor.buildBaseMediaItem.mockImplementation(
      (item: Partial<MediaItemEntity>, targetId: string, targetType: string) =>
        Object.assign(new MediaItemEntity(), item, { targetId, targetType }),
    );
    mediaItemProcessor.saveMediaItem.mockImplementation(
      (media: MediaItemEntity) => Promise.resolve(media),
    );
    mediaItemProcessor.upsertMediaItem.mockImplementation(
      (_id: string, media: MediaItemEntity) => Promise.resolve(media),
    );
    batch.objects = [];
    batch.discard.mockResolvedValue(undefined);
    mediaStorage.deleteAfterCommit.mockResolvedValue(undefined);
    mediaItemProcessor.removeMediaItemsKeepingFiles.mockImplementation(
      (items: MediaItemEntity[]) =>
        Promise.resolve(items.filter((i) => i.isLocalFile).map((i) => i.url)),
    );
    mediaStorage.uploadAll.mockImplementation(() => {
      batch.objects.push({
        key: "local/Shelter/shelter-id/novo.png",
        url: "https://bucket/novo.png",
      });
      return Promise.resolve(batch);
    });
  });

  describe("attachShelterPhotos", () => {
    it("does not query anything for an empty list", async () => {
      await expect(service.attachShelterPhotos([])).resolves.toEqual([]);
      expect(
        mediaItemProcessor.findManyMediaItemsByTargets,
      ).not.toHaveBeenCalled();
    });

    it("attaches each shelter photo in a single query", async () => {
      const first = buildShelterEntity({ id: "shelter-1" });
      const second = buildShelterEntity({ id: "shelter-2" });
      mediaItemProcessor.findManyMediaItemsByTargets.mockResolvedValue([
        buildMediaItem({ id: "media-1", targetId: "shelter-1" }),
      ]);

      await service.attachShelterPhotos([first, second]);

      expect(
        mediaItemProcessor.findManyMediaItemsByTargets,
      ).toHaveBeenCalledTimes(1);
      expect(
        mediaItemProcessor.findManyMediaItemsByTargets,
      ).toHaveBeenCalledWith(["shelter-1", "shelter-2"], SHELTER_MEDIA_TARGET);
      expect(first.mediaItem?.id).toBe("media-1");
      expect(second.mediaItem).toBeNull();
    });

    it("keeps the newest photo when a shelter has more than one", async () => {
      const shelter = buildShelterEntity();
      mediaItemProcessor.findManyMediaItemsByTargets.mockResolvedValue([
        buildMediaItem({
          id: "media-old",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
        buildMediaItem({
          id: "media-new",
          createdAt: new Date("2026-05-01T00:00:00.000Z"),
        }),
      ]);

      await service.attachShelterPhotos([shelter]);

      expect(shelter.mediaItem?.id).toBe("media-new");
    });

    it("prefers a dated photo over one with no date", async () => {
      const shelter = buildShelterEntity();
      mediaItemProcessor.findManyMediaItemsByTargets.mockResolvedValue([
        buildMediaItem({
          id: "media-a",
          createdAt: undefined as unknown as Date,
        }),
        buildMediaItem({
          id: "media-b",
          createdAt: new Date("2020-01-01T00:00:00.000Z"),
        }),
      ]);

      await service.attachShelterPhotos([shelter]);

      expect(shelter.mediaItem?.id).toBe("media-b");
    });

    it("keeps the last one when no photo has a date", async () => {
      const shelter = buildShelterEntity();
      const undated = { createdAt: undefined as unknown as Date };
      mediaItemProcessor.findManyMediaItemsByTargets.mockResolvedValue([
        buildMediaItem({ id: "media-a", ...undated }),
        buildMediaItem({ id: "media-b", ...undated }),
      ]);

      await service.attachShelterPhotos([shelter]);

      expect(shelter.mediaItem?.id).toBe("media-b");
    });
  });

  describe("attachTeamUserPhotos", () => {
    it("attaches the profile photo of leaders and members at once", async () => {
      const shelter = buildShelterEntity({
        teams: [
          buildTeamEntity({
            leaders: [
              buildLeaderProfile({
                user: buildUserEntity({ id: "leader-user-id" }),
              }),
            ],
            members: [
              buildMemberProfile({
                user: buildUserEntity({ id: "member-user-id" }),
              }),
            ],
          }),
        ],
      });
      mediaItemProcessor.findManyMediaItemsByTargets.mockResolvedValue([
        buildMediaItem({ id: "avatar", targetId: "leader-user-id" }),
      ]);

      await service.attachTeamUserPhotos(shelter);

      expect(
        mediaItemProcessor.findManyMediaItemsByTargets,
      ).toHaveBeenCalledWith(
        ["leader-user-id", "member-user-id"],
        USER_MEDIA_TARGET,
      );
      expect(shelter.teams[0].leaders[0].user.imageProfile?.id).toBe("avatar");
      expect(shelter.teams[0].members[0].user.imageProfile).toBeNull();
    });

    it("skips the query when there is nobody in the teams", async () => {
      await service.attachTeamUserPhotos(
        buildShelterEntity({ teams: undefined as unknown as [] }),
      );

      expect(
        mediaItemProcessor.findManyMediaItemsByTargets,
      ).not.toHaveBeenCalled();
    });
  });

  it("attachAll covers the shelter photo and the team photos", async () => {
    const shelter = buildShelterEntity();

    await service.attachAll([shelter]);

    expect(mediaItemProcessor.findManyMediaItemsByTargets).toHaveBeenCalledWith(
      [shelter.id],
      SHELTER_MEDIA_TARGET,
    );
    expect(mediaItemProcessor.findManyMediaItemsByTargets).toHaveBeenCalledWith(
      expect.arrayContaining(["leader-user-id", "member-user-id"]),
      USER_MEDIA_TARGET,
    );
  });

  describe("upsertMainPhoto", () => {
    const file = buildUploadedFile({ fieldname: "cover" });
    const upload = {
      uploadType: UploadType.UPLOAD,
      isLocalFile: true,
      fieldKey: "cover",
    };

    it("uploads the file, records its metadata and creates the media", async () => {
      const url = await service.upsertMainPhoto(
        "shelter-id",
        { title: "Foto", ...upload },
        { cover: file },
      );

      expect(mediaStorage.uploadAll).toHaveBeenCalledWith(
        [expect.objectContaining({ file, ownerId: "shelter-id" })],
        batch,
      );
      expect(mediaItemProcessor.saveMediaItem).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://bucket/novo.png",
          storageKey: "local/Shelter/shelter-id/novo.png",
          isLocalFile: true,
          originalName: "abrigo.png",
          size: 2048,
          targetId: "shelter-id",
          targetType: SHELTER_MEDIA_TARGET,
        }),
      );
      expect(batch.commit).toHaveBeenCalledTimes(1);
      expect(url).toBe("https://bucket/novo.png");
    });

    it("fills in title and description, which the database requires", async () => {
      await service.upsertMainPhoto(
        "shelter-id",
        { url: "https://cdn/foto.png" },
        {},
      );

      expect(mediaItemProcessor.buildBaseMediaItem).toHaveBeenCalledWith(
        expect.objectContaining({
          title: SHELTER_MEDIA_DEFAULT_TITLE,
          description: SHELTER_MEDIA_DEFAULT_DESCRIPTION,
        }),
        "shelter-id",
        SHELTER_MEDIA_TARGET,
      );
    });

    it("keeps the title and description the payload brought", async () => {
      await service.upsertMainPhoto(
        "shelter-id",
        {
          title: "Fachada",
          description: "Vista da rua",
          url: "https://cdn/f.png",
        },
        {},
      );

      expect(mediaItemProcessor.buildBaseMediaItem).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Fachada",
          description: "Vista da rua",
        }),
        "shelter-id",
        SHELTER_MEDIA_TARGET,
      );
    });

    it("replaces the photo: saves the new one FIRST, then drops the old file", async () => {
      mediaItemProcessor.findMediaItemByTarget.mockResolvedValue(
        buildMediaItem({ id: "media-old", url: "https://bucket/antigo.png" }),
      );
      const order: string[] = [];
      mediaItemProcessor.upsertMediaItem.mockImplementation(
        (_id: string, media: MediaItemEntity) => {
          order.push("save");
          return Promise.resolve(media);
        },
      );
      mediaStorage.deleteAfterCommit.mockImplementation(() => {
        order.push("delete-old");
        return Promise.resolve();
      });

      await service.upsertMainPhoto("shelter-id", upload, { cover: file });

      expect(order).toEqual(["save", "delete-old"]);
      expect(mediaStorage.deleteAfterCommit).toHaveBeenCalledWith([
        "https://bucket/antigo.png",
      ]);
      expect(mediaItemProcessor.saveMediaItem).not.toHaveBeenCalled();
    });

    it("database failure discards the new upload and keeps the old file", async () => {
      mediaItemProcessor.findMediaItemByTarget.mockResolvedValue(
        buildMediaItem({ id: "media-old" }),
      );
      mediaItemProcessor.upsertMediaItem.mockRejectedValue(new Error("db"));

      await expect(
        service.upsertMainPhoto("shelter-id", upload, { cover: file }),
      ).rejects.toThrow("db");

      expect(batch.discard).toHaveBeenCalledTimes(1);
      expect(batch.commit).not.toHaveBeenCalled();
      expect(mediaStorage.deleteAfterCommit).not.toHaveBeenCalled();
    });

    it("rejected upload (policy) keeps the old file untouched", async () => {
      mediaItemProcessor.findMediaItemByTarget.mockResolvedValue(
        buildMediaItem({ id: "media-old" }),
      );
      mediaStorage.uploadAll.mockRejectedValue(new Error("MIME"));

      await expect(
        service.upsertMainPhoto("shelter-id", upload, { cover: file }),
      ).rejects.toThrow("MIME");

      expect(mediaItemProcessor.upsertMediaItem).not.toHaveBeenCalled();
      expect(mediaStorage.deleteAfterCommit).not.toHaveBeenCalled();
    });

    it("does not touch the bucket when the previous photo was a link", async () => {
      mediaItemProcessor.findMediaItemByTarget.mockResolvedValue(
        buildMediaItem({ isLocalFile: false }),
      );

      await service.upsertMainPhoto(
        "shelter-id",
        { url: "https://cdn/foto.png" },
        {},
      );

      expect(mediaStorage.deleteAfterCommit).not.toHaveBeenCalled();
    });

    it("records a link without uploading anything", async () => {
      const url = await service.upsertMainPhoto(
        "shelter-id",
        { uploadType: UploadType.LINK, url: "https://cdn/foto.png" },
        {},
      );

      expect(mediaStorage.uploadAll).not.toHaveBeenCalled();
      expect(url).toBe("https://cdn/foto.png");
      expect(mediaItemProcessor.saveMediaItem).toHaveBeenCalledWith(
        expect.objectContaining({ isLocalFile: false }),
      );
    });

    it("refuses an upload whose file did not arrive, naming what did", async () => {
      await expect(
        service.upsertMainPhoto("shelter-id", upload, { outro: file }),
      ).rejects.toThrow(
        new RuleException(
          SHELTER_MESSAGES.MEDIA_FILE_MISSING("cover", ["outro"]),
        ),
      );
      expect(mediaStorage.uploadAll).not.toHaveBeenCalled();
    });

    it("refuses a payload with neither file nor url", async () => {
      await expect(
        service.upsertMainPhoto("shelter-id", { title: "Foto" }, {}),
      ).rejects.toThrow(
        new RuleException(SHELTER_MESSAGES.MEDIA_SOURCE_REQUIRED),
      );
    });
  });

  describe("removeAllForShelter", () => {
    it("reports zero and deletes nothing when there is no media", async () => {
      await expect(service.removeAllForShelter("shelter-id")).resolves.toBe(0);
      expect(
        mediaItemProcessor.removeMediaItemsKeepingFiles,
      ).not.toHaveBeenCalled();
    });

    it("removes the rows first and the bucket objects after (local files only)", async () => {
      const items = [
        buildMediaItem({ id: "m1", url: "https://bucket/a.png" }),
        buildMediaItem({ id: "m2", isLocalFile: false, url: "https://cdn/b" }),
      ];
      mediaItemProcessor.findMediaItemsByTarget.mockResolvedValue(items);

      await expect(service.removeAllForShelter("shelter-id")).resolves.toBe(2);

      expect(
        mediaItemProcessor.removeMediaItemsKeepingFiles,
      ).toHaveBeenCalledWith(items);
      expect(mediaStorage.deleteAfterCommit).toHaveBeenCalledWith([
        "https://bucket/a.png",
      ]);
    });

    it("database failure leaves the bucket untouched (no broken reference)", async () => {
      mediaItemProcessor.findMediaItemsByTarget.mockResolvedValue([
        buildMediaItem({ id: "m1" }),
      ]);
      mediaItemProcessor.removeMediaItemsKeepingFiles.mockRejectedValue(
        new Error("db"),
      );

      await expect(service.removeAllForShelter("shelter-id")).rejects.toThrow(
        "db",
      );
      expect(mediaStorage.deleteAfterCommit).not.toHaveBeenCalled();
    });
  });

  it("findMainPhoto asks the processor for the shelter target", async () => {
    const media = buildMediaItem();
    mediaItemProcessor.findMediaItemByTarget.mockResolvedValue(media);

    await expect(service.findMainPhoto("shelter-id")).resolves.toBe(media);
    expect(mediaItemProcessor.findMediaItemByTarget).toHaveBeenCalledWith(
      "shelter-id",
      SHELTER_MEDIA_TARGET,
    );
  });
});
