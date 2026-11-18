import { Injectable, Logger } from "@nestjs/common";
import {
  MediaItemEntity,
  MediaType,
  PlatformType,
  UploadType,
} from "./media-item/media-item.entity";
import { MediaItemRepository } from "./media-item-repository";

/** Item de mídia vindo do DTO (link ou upload referenciado por `fileField`). */
export interface MediaItemInput {
  id?: string;
  title?: string;
  description?: string;
  mediaType: MediaType;
  uploadType?: UploadType;
  platformType?: PlatformType | null;
  url?: string;
  originalName?: string;
  size?: number | string;
  isLocalFile?: boolean;
  fileField?: string;
  /** Aceito e ignorado aqui: alguns chamadores montam o literal com `public`. */
  public?: boolean;
  type?: UploadType;
  fieldKey?: string;
}

@Injectable()
export class MediaItemProcessor {
  private readonly logger = new Logger(MediaItemProcessor.name);

  constructor(private readonly mediaRepo: MediaItemRepository) {}

  async findMediaItemsByTarget(
    targetId: string,
    targetType: string,
  ): Promise<MediaItemEntity[]> {
    return this.mediaRepo.findByTarget(targetId, targetType);
  }

  async findMediaItemByTarget(
    targetId: string,
    targetType: string,
  ): Promise<MediaItemEntity | null> {
    const items = await this.findMediaItemsByTarget(targetId, targetType);
    return items.length > 0 ? items[0] : null;
  }

  async findManyMediaItemsByTargets(
    targetIds: string[],
    targetType: string,
  ): Promise<MediaItemEntity[]> {
    return this.mediaRepo.findManyByTargets(targetIds, targetType);
  }

  buildBaseMediaItem(
    item: MediaItemInput,
    targetId: string,
    targetType: string,
  ): MediaItemEntity {
    const media = new MediaItemEntity();
    media.title = item.title ?? "";
    media.description = item.description ?? "";
    media.mediaType = item.mediaType;
    media.uploadType = item.uploadType ?? UploadType.LINK;
    media.platformType = item.platformType ?? undefined;
    media.url = item.url ?? "";
    media.originalName = item.originalName;
    media.size = item.size === undefined ? undefined : Number(item.size);
    media.isLocalFile = item.isLocalFile ?? false;
    media.targetId = targetId;
    media.targetType = targetType;
    return media;
  }

  /**
   * Lookup by id, so a consumer can inspect the stored item (e.g. the previous
   * S3 url) without reaching for TypeORM itself.
   */
  async findMediaItemById(id: string): Promise<MediaItemEntity | null> {
    return this.mediaRepo.findById(id);
  }

  async saveMediaItem(media: MediaItemEntity): Promise<MediaItemEntity> {
    return this.mediaRepo.save(media);
  }

  async upsertMediaItem(
    id: string | undefined,
    media: MediaItemEntity,
  ): Promise<MediaItemEntity> {
    if (id) {
      await this.mediaRepo.saveById(id, media);
      media.id = id;
      return media;
    } else {
      return this.saveMediaItem(media);
    }
  }

  async deleteMediaItems(
    items: MediaItemEntity[],
    deleteFn: (url: string) => Promise<void>,
  ): Promise<void> {
    for (const item of items) {
      if (item.isLocalFile) {
        await deleteFn(item.url);
      }
    }
    await this.mediaRepo.removeMany(items);
  }

  async removeMediaItem(
    item: MediaItemEntity,
    deleteFn?: (url: string) => Promise<void>,
  ): Promise<void> {
    if (item.isLocalFile && deleteFn) {
      await deleteFn(item.url);
    }
    await this.mediaRepo.removeOne(item);
  }

  /**
   * Se um item falhar, o que já subiu nesta chamada é apagado (via `discardFn`)
   * e as linhas já gravadas são removidas — não sobra objeto órfão.
   */
  async processMediaItemsPolymorphic(
    items: MediaItemInput[],
    targetId: string,
    targetType: string,
    filesDict: Record<string, Express.Multer.File>,
    uploadFn: (file: Express.Multer.File) => Promise<string>,
    discardFn?: (url: string) => Promise<void>,
  ): Promise<MediaItemEntity[]> {
    const results: MediaItemEntity[] = [];
    const uploadedUrls: string[] = [];

    try {
      for (const item of items) {
        const media = this.buildBaseMediaItem(item, targetId, targetType);

        if (item.uploadType === UploadType.UPLOAD) {
          const file = filesDict[item.fileField ?? ""];
          if (!file) throw new Error(`File missing for "${item.title}"`);

          media.url = await uploadFn(file);
          uploadedUrls.push(media.url);
          media.isLocalFile = true;
          media.originalName = file.originalname;
          media.size = file.size;
        } else {
          media.url = item.url?.trim() || "";
          media.isLocalFile = false;
        }

        results.push(await this.saveMediaItem(media));
      }
    } catch (error) {
      await this.compensate(results, uploadedUrls, discardFn);
      throw error;
    }

    return results;
  }

  private async compensate(
    saved: MediaItemEntity[],
    uploadedUrls: string[],
    discardFn?: (url: string) => Promise<void>,
  ): Promise<void> {
    if (saved.length) await this.mediaRepo.removeMany(saved);
    if (!discardFn) return;
    for (const url of uploadedUrls) {
      await discardFn(url);
    }
  }

  async cleanAndReplaceMediaItems(
    items: MediaItemInput[],
    targetId: string,
    targetType: string,
    filesDict: Record<string, Express.Multer.File>,
    oldItems: MediaItemEntity[],
    deleteFn: (url: string) => Promise<void>,
    uploadFn: (file: Express.Multer.File) => Promise<string>,
  ): Promise<MediaItemEntity[]> {
    const validIncoming = items.filter((item) => {
      if (item.uploadType !== UploadType.UPLOAD) return true;

      const fileRef = item.url || item.fileField;
      const exists = oldItems.some((old) => old.url === fileRef);
      const hasFile = !!filesDict[item.fileField ?? ""];

      return exists || hasFile;
    });

    const validUploadUrls = new Set(
      validIncoming
        .filter((item) => item.uploadType === UploadType.UPLOAD)
        .map((item) => {
          const fileRef = item.url || item.fileField;
          return oldItems.find((old) => old.url === fileRef)?.url;
        })
        .filter(Boolean),
    );

    const toRemove = oldItems.filter(
      (item) => item.isLocalFile && !validUploadUrls.has(item.url),
    );
    if (toRemove.length) {
      await this.deleteMediaItems(toRemove, deleteFn);
    }

    const results: MediaItemEntity[] = [];

    for (const item of validIncoming) {
      const media = this.buildBaseMediaItem(item, targetId, targetType);

      if (item.uploadType === UploadType.UPLOAD) {
        const previous = oldItems.find(
          (old) => old.url === (item.url || item.fileField),
        );

        if (previous) {
          media.url = previous.url;
          media.isLocalFile = previous.isLocalFile;
          media.originalName = previous.originalName;
          media.size = previous.size;
        } else {
          const file = filesDict[item.fileField ?? ""];
          if (!file) throw new Error(`File missing for "${item.title}"`);

          media.url = await uploadFn(file);
          media.isLocalFile = true;
          media.originalName = file.originalname;
          media.size = file.size;
        }
      } else {
        media.url = item.url?.trim() || "";
        media.isLocalFile = false;
      }

      const saved = await this.upsertMediaItem(item.id, media);
      results.push(saved);
    }

    return results;
  }
}
