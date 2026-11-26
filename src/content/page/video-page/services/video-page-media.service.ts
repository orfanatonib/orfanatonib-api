import { BadRequestException, Injectable } from "@nestjs/common";
import { MediaItemDto } from "src/shared/dto/media-item-dto";
import {
  MediaItemEntity,
  MediaType,
  PlatformType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import type { UploadBatch } from "src/shared/media/storage/upload-batch";
import { VideoPageMessages } from "../constants";

export interface MaterializedVideo {
  media: MediaItemEntity;
  /** URL do arquivo antigo que sai do bucket só depois do commit. */
  obsoleteUrl?: string;
}

/** Monta a mídia de uma página de vídeos; os arquivos novos entram no `batch` (descartável se algo falhar). */
@Injectable()
export class VideoPageMediaService {
  constructor(
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  async materialize(
    input: MediaItemDto,
    pageId: string,
    filesDict: Record<string, Express.Multer.File>,
    batch: UploadBatch,
    existing?: MediaItemEntity,
  ): Promise<MaterializedVideo> {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      {
        ...input,
        mediaType: MediaType.VIDEO,
        platformType: input.platformType,
      },
      pageId,
      MediaTargetType.VideosPage,
    );
    if (existing) media.id = existing.id;
    const hadLocalFile = !!existing?.isLocalFile && !!existing.url;

    if (input.uploadType === UploadType.UPLOAD) {
      const key = input.fieldKey ?? input.fileField ?? input.url;
      const file = key ? filesDict[key] : undefined;

      if (file) {
        const uploaded = await this.upload(file, pageId, batch);
        media.url = uploaded.url;
        media.storageKey = uploaded.key;
        media.isLocalFile = true;
        media.originalName = file.originalname;
        media.size = file.size;
        return {
          media,
          obsoleteUrl: hadLocalFile ? existing.url : undefined,
        };
      }
      if (existing?.isLocalFile) {
        media.url = existing.url;
        media.storageKey = existing.storageKey;
        media.isLocalFile = true;
        media.originalName = existing.originalName;
        media.size = existing.size;
        return { media };
      }
      throw new BadRequestException(
        `File missing for upload: ${key ?? "no fieldKey or url provided"}`,
      );
    }

    if (input.uploadType === UploadType.LINK) {
      const url = input.url?.trim();
      if (!url) throw new BadRequestException(VideoPageMessages.URL_REQUIRED);
      media.url = url;
      media.storageKey = null;
      media.isLocalFile = false;
      media.platformType = input.platformType ?? PlatformType.YOUTUBE;
      return {
        media,
        obsoleteUrl: hadLocalFile ? existing.url : undefined,
      };
    }

    throw new BadRequestException(
      `Invalid media type: ${String(input.uploadType)}`,
    );
  }

  private async upload(
    file: Express.Multer.File,
    pageId: string,
    batch: UploadBatch,
  ): Promise<{ url: string; key: string }> {
    await this.mediaStorage.uploadAll(
      [
        {
          file,
          mediaType: MediaType.VIDEO,
          entity: MediaTargetType.VideosPage,
          ownerId: pageId,
        },
      ],
      batch,
    );
    return batch.objects[batch.objects.length - 1];
  }
}
