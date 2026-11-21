import { Injectable } from "@nestjs/common";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import {
  MediaItemEntity,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { MediaItemDto } from "src/shared/dto/media-item-dto";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { UpdateSectionDto } from "../dto/update-image.dto";
import { MediaChangeLog } from "../media-change-log";
import { ImagePageTransaction } from "../repositories/image-page-transaction.repository";

type FilesDict = Record<string, Express.Multer.File>;

/** Mídias da galeria na atualização: linhas dentro da transação, objetos só registrados no `MediaChangeLog`. */
@Injectable()
export class UpdateImagePageMediaService {
  constructor(
    private readonly awsS3Service: AwsS3Service,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  async removeUnrequested(
    existingMedia: MediaItemEntity[],
    requestedSections: UpdateSectionDto[],
    tx: ImagePageTransaction,
    log: MediaChangeLog,
  ): Promise<void> {
    const requestedIds = new Set(
      requestedSections
        .flatMap((section) => section.mediaItems.map((media) => media.id))
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    );
    for (const media of existingMedia) {
      if (!media.id || requestedIds.has(media.id)) continue;
      if (media.isLocalFile) log.recordObsolete(media.url);
      await tx.removeMedia(media);
    }
  }

  async processSectionMedia(
    mediaItems: MediaItemDto[],
    sectionId: string,
    filesDict: FilesDict,
    tx: ImagePageTransaction,
    log: MediaChangeLog,
  ): Promise<MediaItemEntity[]> {
    const processed: MediaItemEntity[] = [];
    for (const mediaInput of mediaItems) {
      processed.push(
        mediaInput.id
          ? await this.upsertMedia(mediaInput, sectionId, filesDict, tx, log)
          : await this.addMedia(mediaInput, sectionId, filesDict, tx, log),
      );
    }
    return processed;
  }

  async addMedia(
    mediaInput: MediaItemDto,
    targetId: string,
    filesDict: FilesDict,
    tx: ImagePageTransaction,
    log: MediaChangeLog,
  ): Promise<MediaItemEntity> {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      mediaInput,
      targetId,
      MediaTargetType.ImagesPage,
    );
    if (mediaInput.isLocalFile) {
      const key = mediaInput.fieldKey ?? mediaInput.url;
      if (!key) {
        throw new Error("File missing for upload: no fieldKey or url provided");
      }
      const file = filesDict[key];
      if (!file) {
        throw new Error(`File not found for upload: ${key}`);
      }
      media.url = await this.awsS3Service.upload(file);
      log.recordUpload(media.url);
      media.originalName = file.originalname;
      media.size = file.size;
    }
    return tx.saveMedia(media);
  }

  async upsertMedia(
    mediaInput: MediaItemDto,
    targetId: string,
    filesDict: FilesDict,
    tx: ImagePageTransaction,
    log: MediaChangeLog,
  ): Promise<MediaItemEntity> {
    const existing = mediaInput.id ? await tx.findMedia(mediaInput.id) : null;
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      mediaInput,
      targetId,
      MediaTargetType.ImagesPage,
    );
    const isUpload =
      mediaInput.uploadType === UploadType.UPLOAD && mediaInput.isLocalFile;
    const key = mediaInput.fieldKey ?? mediaInput.url;
    const file = key ? filesDict[key] : undefined;

    if (isUpload && file) {
      if (existing?.isLocalFile) log.recordObsolete(existing.url);
      media.url = await this.awsS3Service.upload(file);
      log.recordUpload(media.url);
      media.originalName = file.originalname;
      media.isLocalFile = true;
      media.size = file.size;
    } else if (isUpload && existing) {
      media.url = existing.url;
      media.originalName = existing.originalName;
      media.isLocalFile = existing.isLocalFile;
      media.size = existing.size;
    } else {
      if (existing?.isLocalFile && !mediaInput.isLocalFile) {
        log.recordObsolete(existing.url);
      }
      media.title = mediaInput.title || media.title;
      media.description = mediaInput.description || media.description;
      media.uploadType = mediaInput.uploadType || media.uploadType;
      media.platformType = mediaInput.platformType || media.platformType;
      media.mediaType = mediaInput.mediaType || media.mediaType;
      media.url = mediaInput.url?.trim() || media.url;
      media.originalName = mediaInput.originalName || media.originalName;
      media.isLocalFile = mediaInput.isLocalFile ?? false;
      media.size = mediaInput.size || media.size;
    }

    return tx.saveMedia({ ...media, id: mediaInput.id });
  }
}
