import { Injectable } from "@nestjs/common";
import {
  ResourceNotFoundException,
  RuleException,
} from "src/common/exceptions";
import { MediaItemDto } from "src/shared/dto/media-item-dto";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import {
  MediaItemEntity,
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import {
  VISIT_MATERIAL_MEDIA_TYPES,
  VISIT_MATERIAL_MESSAGES,
} from "../constants";
import {
  StoredMediaByType,
  UploadedFilesDict,
  VisitMaterialMediaBuckets,
  VisitMaterialWriteUnit,
} from "../types";

const TARGET_TYPE = MediaTargetType.VisitMaterialsPage;

/**
 * Owns every media rule of a visit material page. One routine serves the four
 * buckets: the media type is a parameter, never a copy of the same code.
 */
@Injectable()
export class VisitMaterialMediaService {
  constructor(
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  /** Buckets in the order the page persists and returns them. */
  static toEntries(
    buckets: VisitMaterialMediaBuckets,
  ): ReadonlyArray<readonly [MediaType, MediaItemDto[]]> {
    return [
      [MediaType.VIDEO, buckets.videos],
      [MediaType.DOCUMENT, buckets.documents],
      [MediaType.IMAGE, buckets.images],
      [MediaType.AUDIO, buckets.audios],
    ] as const;
  }

  /** Every media item stored for the page, in a single query. */
  async findAllByPage(
    pageId: string,
    targetType: MediaTargetType = TARGET_TYPE,
  ): Promise<MediaItemEntity[]> {
    return this.mediaItemProcessor.findMediaItemsByTarget(pageId, targetType);
  }

  /**
   * Stored media grouped by type. Replaces four identical queries, one per
   * bucket, with a single round trip.
   */
  async findGroupedByPage(
    pageId: string,
    targetType: MediaTargetType = TARGET_TYPE,
  ): Promise<StoredMediaByType> {
    const items = await this.findAllByPage(pageId, targetType);
    const grouped = new Map<MediaType, MediaItemEntity[]>(
      VISIT_MATERIAL_MEDIA_TYPES.map((mediaType) => [mediaType, []]),
    );

    for (const item of items) {
      grouped.get(item.mediaType)?.push(item);
    }

    return grouped;
  }

  /**
   * Flattens the buckets for the create path, stamping each item with its media
   * type and the upload field the file will arrive on.
   */
  toPolymorphicItems(
    buckets: VisitMaterialMediaBuckets,
    files: UploadedFilesDict,
  ): MediaItemDto[] {
    const items = VisitMaterialMediaService.toEntries(buckets).flatMap(
      ([mediaType, bucket]) =>
        bucket.map((media) => ({
          ...media,
          mediaType,
          fileField: this.isUpload(media) ? media.fieldKey : undefined,
        })),
    );

    // O processador compartilhado sinaliza arquivo ausente com um Error puro,
    // que viraria 500. A checagem fica aqui para continuar sendo 400.
    for (const item of items) {
      if (!this.isUpload(item)) {
        this.assertLinkUrl(item);
        continue;
      }
      if (!item.fileField) {
        throw new RuleException(
          VISIT_MATERIAL_MESSAGES.MISSING_FIELD_KEY(item.title ?? ""),
        );
      }
      if (!files[item.fileField]) {
        throw new RuleException(
          VISIT_MATERIAL_MESSAGES.MISSING_FILE(item.title ?? ""),
        );
      }
    }

    return items;
  }

  /**
   * Reconciles one owner's media (a page or a section) with the payload, inside the caller's write unit:
   * items the payload dropped are removed, items with an id are updated and the rest are created.
   * Nothing touches the bucket destructively here — replaced and removed files go to
   * `unit.obsoleteUrls` and only leave after the commit.
   */
  async reconcile(
    unit: VisitMaterialWriteUnit,
    ownerId: string,
    buckets: VisitMaterialMediaBuckets,
    files: UploadedFilesDict,
    targetType: MediaTargetType = TARGET_TYPE,
  ): Promise<void> {
    const stored = await this.findGroupedByPage(ownerId, targetType);
    const entries = VisitMaterialMediaService.toEntries(buckets);

    for (const [mediaType, incoming] of entries) {
      const incomingIds = new Set(
        incoming.map((item) => item.id).filter((id): id is string => !!id),
      );
      const dropped = (stored.get(mediaType) ?? []).filter(
        (item) => !incomingIds.has(item.id),
      );
      unit.obsoleteUrls.push(
        ...(await this.mediaItemProcessor.removeMediaItemsKeepingFiles(
          dropped,
          unit.manager,
        )),
      );
    }

    for (const [mediaType, incoming] of entries) {
      for (const input of incoming) {
        await this.persist(unit, input, ownerId, mediaType, targetType, files);
      }
    }
  }

  /** Creates the item (no id) or updates the stored one (id), staging uploads in the unit's batch. */
  private async persist(
    unit: VisitMaterialWriteUnit,
    input: MediaItemDto,
    ownerId: string,
    mediaType: MediaType,
    targetType: MediaTargetType,
    files: UploadedFilesDict,
  ): Promise<MediaItemEntity> {
    const stored = input.id
      ? await this.findOwnedStoredItem(input, ownerId, mediaType, targetType)
      : null;
    const media = this.buildBase(input, ownerId, mediaType, targetType);

    if (this.isUpload(input)) {
      if (stored && !input.fieldKey && stored.isLocalFile) {
        this.keepStoredUpload(media, stored);
      } else {
        await this.stageUpload(unit, media, input, files, ownerId, targetType);
        this.markObsolete(unit, stored);
      }
    } else {
      this.assertLinkUrl(input);
      this.applyLink(media, input);
      this.markObsolete(unit, stored);
    }

    return this.mediaItemProcessor.upsertMediaItem(
      stored?.id,
      media,
      unit.manager,
    );
  }

  /** The replaced file leaves the bucket only after the commit. */
  private markObsolete(
    unit: VisitMaterialWriteUnit,
    stored: MediaItemEntity | null,
  ): void {
    if (stored?.isLocalFile && stored.url) unit.obsoleteUrls.push(stored.url);
  }

  /**
   * An item is an upload when the payload says so or when it declares a local
   * file, mirroring how the admin form submits.
   */
  private isUpload(input: MediaItemDto): boolean {
    return input.uploadType === UploadType.UPLOAD || input.isLocalFile === true;
  }

  private buildBase(
    input: MediaItemDto,
    pageId: string,
    mediaType: MediaType,
    targetType: MediaTargetType = TARGET_TYPE,
  ): MediaItemEntity {
    return this.mediaItemProcessor.buildBaseMediaItem(
      { ...input, mediaType },
      pageId,
      targetType,
    );
  }

  /** Validates the upload and sends it to the unit's batch (discarded if the edit fails). */
  private async stageUpload(
    unit: VisitMaterialWriteUnit,
    media: MediaItemEntity,
    input: MediaItemDto,
    files: UploadedFilesDict,
    ownerId: string,
    targetType: MediaTargetType,
  ): Promise<void> {
    if (!input.fieldKey) {
      throw new RuleException(
        VISIT_MATERIAL_MESSAGES.MISSING_FIELD_KEY(input.title ?? ""),
      );
    }

    const file = files[input.fieldKey];
    if (!file) {
      throw new RuleException(
        VISIT_MATERIAL_MESSAGES.MISSING_FILE(input.title ?? ""),
      );
    }

    await this.mediaStorage.uploadAll(
      [{ file, mediaType: media.mediaType, entity: targetType, ownerId }],
      unit.batch,
    );
    const uploaded = unit.batch.objects[unit.batch.objects.length - 1];

    media.platformType = undefined;
    media.url = uploaded.url;
    media.storageKey = uploaded.key;
    // The file now lives in our bucket, so it is local regardless of what the
    // payload claimed — otherwise the cleanup on delete would skip it.
    media.isLocalFile = true;
    media.originalName = file.originalname;
    media.size = file.size;
  }

  private applyLink(media: MediaItemEntity, input: MediaItemDto): void {
    media.title = input.title ?? media.title;
    media.description = input.description ?? media.description;
    media.uploadType = input.uploadType ?? media.uploadType;
    media.platformType = input.platformType ?? media.platformType;
    media.url = input.url?.trim() ?? media.url;
    media.originalName = input.originalName ?? media.originalName;
    media.size = input.size ?? media.size;
    media.isLocalFile = false;
  }

  private assertLinkUrl(input: MediaItemDto): void {
    if (!input.url?.trim()) {
      throw new RuleException(
        VISIT_MATERIAL_MESSAGES.LINK_URL_REQUIRED(input.title ?? ""),
      );
    }
  }

  private async findOwnedStoredItem(
    input: MediaItemDto,
    pageId: string,
    mediaType: MediaType,
    targetType: MediaTargetType = TARGET_TYPE,
  ): Promise<MediaItemEntity> {
    const stored = input.id
      ? await this.mediaItemProcessor.findMediaItemById(input.id)
      : null;

    if (
      !stored ||
      stored.targetId !== pageId ||
      stored.targetType !== (targetType as string) ||
      stored.mediaType !== mediaType
    ) {
      throw new ResourceNotFoundException(
        VISIT_MATERIAL_MESSAGES.MEDIA_NOT_FOUND,
        { mediaId: input.id, pageId },
      );
    }

    return stored;
  }

  private keepStoredUpload(
    media: MediaItemEntity,
    stored: MediaItemEntity,
  ): void {
    media.uploadType = UploadType.UPLOAD;
    media.platformType = undefined;
    media.url = stored.url;
    media.isLocalFile = true;
    media.originalName = stored.originalName;
    media.size = stored.size;
  }
}
