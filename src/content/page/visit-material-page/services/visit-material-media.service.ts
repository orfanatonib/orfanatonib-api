import { Injectable, Logger } from "@nestjs/common";
import { RuleException } from "src/common/exceptions";
import { MediaItemDto } from "src/shared/dto/media-item-dto";
import { AwsS3Service } from "src/infrastructure/aws/aws-s3.service";
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
} from "../types";

const TARGET_TYPE = MediaTargetType.VisitMaterialsPage;

/**
 * Owns every media rule of a visit material page. One routine serves the four
 * buckets: the media type is a parameter, never a copy of the same code.
 */
@Injectable()
export class VisitMaterialMediaService {
  private readonly logger = new Logger(VisitMaterialMediaService.name);

  constructor(
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly s3: AwsS3Service,
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
  async findAllByPage(pageId: string): Promise<MediaItemEntity[]> {
    return this.mediaItemProcessor.findMediaItemsByTarget(pageId, TARGET_TYPE);
  }

  /**
   * Stored media grouped by type. Replaces four identical queries, one per
   * bucket, with a single round trip.
   */
  async findGroupedByPage(pageId: string): Promise<StoredMediaByType> {
    const items = await this.findAllByPage(pageId);
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
      if (!this.isUpload(item)) continue;
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

  /** Deletes the stored items the incoming payload no longer references. */
  async removeMissing(
    stored: MediaItemEntity[],
    incoming: MediaItemDto[],
  ): Promise<void> {
    const incomingIds = new Set(
      incoming.map((item) => item.id).filter((id): id is string => Boolean(id)),
    );
    const toRemove = stored.filter((item) => !incomingIds.has(item.id));

    if (toRemove.length > 0) {
      await this.mediaItemProcessor.deleteMediaItems(toRemove, (url) =>
        this.s3.delete(url),
      );
    }
  }

  /** Persists a brand new media item. */
  async add(
    input: MediaItemDto,
    pageId: string,
    mediaType: MediaType,
    files: UploadedFilesDict,
  ): Promise<MediaItemEntity> {
    const media = this.buildBase(input, pageId, mediaType);

    if (this.isUpload(input)) {
      await this.applyUpload(media, input, files);
    } else {
      this.applyLink(media, input);
    }

    return this.mediaItemProcessor.saveMediaItem(media);
  }

  /** Updates an existing media item, cleaning up the file it replaces. */
  async upsert(
    input: MediaItemDto,
    pageId: string,
    mediaType: MediaType,
    files: UploadedFilesDict,
  ): Promise<MediaItemEntity> {
    const media = this.buildBase(input, pageId, mediaType);
    const replacesFile =
      input.uploadType === UploadType.UPLOAD &&
      Boolean(input.isLocalFile) &&
      Boolean(input.fieldKey);
    const stored = input.id
      ? await this.mediaItemProcessor.findMediaItemById(input.id)
      : null;

    if (replacesFile) {
      if (stored?.isLocalFile) {
        await this.s3.delete(stored.url);
      }
      await this.applyUpload(media, input, files);
    } else {
      await this.discardReplacedFile(stored, input);
      this.applyLink(media, input);
    }

    return this.mediaItemProcessor.upsertMediaItem(input.id, media);
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
  ): MediaItemEntity {
    return this.mediaItemProcessor.buildBaseMediaItem(
      { ...input, mediaType },
      pageId,
      TARGET_TYPE,
    );
  }

  private async applyUpload(
    media: MediaItemEntity,
    input: MediaItemDto,
    files: UploadedFilesDict,
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

    media.platformType = undefined;
    media.url = await this.s3.upload(file);
    // The file now lives in our bucket, so it is local regardless of what the
    // payload claimed — otherwise the cleanup on delete would skip it.
    media.isLocalFile = true;
    media.originalName = file.originalname;
    media.size = file.size;
  }

  private applyLink(media: MediaItemEntity, input: MediaItemDto): void {
    media.title = input.title || media.title;
    media.description = input.description || media.description;
    media.uploadType = input.uploadType || media.uploadType;
    media.platformType = input.platformType || media.platformType;
    media.url = input.url?.trim() || media.url;
    media.originalName = input.originalName || media.originalName;
    media.size = input.size || media.size;
    media.isLocalFile = false;
  }

  /**
   * When an item switches from an uploaded file to an external link, the old
   * object is best-effort deleted: failing to clean it up must not abort the
   * update the user asked for.
   */
  private async discardReplacedFile(
    stored: MediaItemEntity | null,
    input: MediaItemDto,
  ): Promise<void> {
    if (!stored?.isLocalFile || !stored.url || input.isLocalFile) return;

    try {
      await this.s3.delete(stored.url);
    } catch {
      this.logger.warn(
        "Could not delete the previous file when switching to a link",
      );
    }
  }
}
