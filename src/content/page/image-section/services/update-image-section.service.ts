import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import {
  UploadType,
  MediaItemEntity,
} from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { MediaItemDto } from "src/shared/dto/media-item-dto";
import { FEED_PAGE_ID_ENV } from "src/content/page/image-page/constants";
import { MediaChangeLog } from "src/content/page/image-page/media-change-log";
import { ImagePageRepository } from "src/content/page/image-page/repositories/image-page.repository";
import { ImageSectionReviewStatus } from "../enums/image-section-review-status.enum";
import { validateShelterPostMedia } from "../media-validation";
import {
  ImageSectionTransaction,
  ImageSectionTransactionRepository,
} from "../repositories/image-section-transaction.repository";
import { UpdateImageSectionDto } from "../dto/update-image-section.dto";
import { ImageSectionResponseDto } from "../dto/image-section-response.dto";

type FilesDict = Record<string, Express.Multer.File>;

@Injectable()
export class UpdateImageSectionService {
  private readonly logger = new Logger(UpdateImageSectionService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly transactions: ImageSectionTransactionRepository,
    private readonly awsS3Service: AwsS3Service,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly pageRepo: ImagePageRepository,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  /**
   * Ordem segura (plano 32): objeto novo → linhas → commit → só então some o antigo.
   * Todas as linhas (publicação e mídias) usam a MESMA transação: se algo falha, nada
   * foi gravado e só os objetos recém-enviados são descartados.
   */
  async updateSection(
    id: string,
    dto: UpdateImageSectionDto,
    filesDict: FilesDict,
    reviewerId: string | null = null,
  ): Promise<ImageSectionResponseDto> {
    const existingForValidation =
      await this.mediaItemProcessor.findManyMediaItemsByTargets(
        [id],
        MediaTargetType.ImagesPage,
      );
    validateShelterPostMedia(dto.mediaItems, filesDict, existingForValidation);

    const log = new MediaChangeLog();
    let result: ImageSectionResponseDto;
    try {
      result = await this.transactions.run((tx) =>
        this.applyUpdate(tx, id, dto, filesDict, reviewerId, log),
      );
    } catch (error) {
      await this.mediaStorage.deleteAfterCommit(log.uploadedUrls);
      if (error instanceof NotFoundException) throw error;
      this.logger.error("Error updating section", error);
      throw new BadRequestException("Error updating section");
    }

    await this.mediaStorage.deleteAfterCommit(log.obsoleteUrls);
    return result;
  }

  private async applyUpdate(
    tx: ImageSectionTransaction,
    id: string,
    dto: UpdateImageSectionDto,
    filesDict: FilesDict,
    reviewerId: string | null,
    log: MediaChangeLog,
  ): Promise<ImageSectionResponseDto> {
    // Trava: duas edições simultâneas da mesma publicação se enfileiram.
    await tx.lockSection(id);
    const section = await tx.findSection(id);
    if (!section) throw new NotFoundException("Section not found");

    const targetPageId =
      dto.pageId ?? this.configService.get<string>(FEED_PAGE_ID_ENV);
    // `findOneBy({ id: undefined })` casaria com qualquer galeria: exige id.
    const page = targetPageId
      ? await this.pageRepo.findOneBy({ id: targetPageId })
      : null;
    if (!page) throw new NotFoundException("Default page not found");

    const existingMedia = await this.mediaItemProcessor.findMediaItemsByTarget(
      section.id,
      MediaTargetType.ImagesPage,
    );
    await this.removeUnrequested(existingMedia, dto.mediaItems, tx, log);

    const processed: MediaItemEntity[] = [];
    for (const input of dto.mediaItems) {
      processed.push(
        input.id
          ? await this.upsertMedia(input, section.id, filesDict, tx, log)
          : await this.addMedia(input, section.id, filesDict, tx, log),
      );
    }

    section.caption = dto.caption;
    section.description = dto.description;
    section.public = dto.public || false;
    section.page = page;
    // Anexar à galeria é aprovar: registra quem revisou e limpa um motivo anterior.
    section.reviewStatus = ImageSectionReviewStatus.APPROVED;
    section.rejectionReason = null;
    section.reviewedBy = reviewerId ? ({ id: reviewerId } as never) : null;
    section.reviewedAt = new Date();
    const saved = await tx.saveSection(section);
    return ImageSectionResponseDto.fromEntity(saved, processed);
  }

  private async removeUnrequested(
    existingMedia: MediaItemEntity[],
    incoming: MediaItemDto[],
    tx: ImageSectionTransaction,
    log: MediaChangeLog,
  ): Promise<void> {
    const incomingIds = new Set(
      incoming.map((m) => m.id).filter((v): v is string => !!v),
    );
    for (const media of existingMedia) {
      if (incomingIds.has(media.id)) continue;
      if (media.isLocalFile) log.recordObsolete(media.url);
      await tx.removeMedia(media);
    }
  }

  private async addMedia(
    input: MediaItemDto,
    sectionId: string,
    filesDict: FilesDict,
    tx: ImageSectionTransaction,
    log: MediaChangeLog,
  ): Promise<MediaItemEntity> {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      input,
      sectionId,
      MediaTargetType.ImagesPage,
    );
    if (input.uploadType === UploadType.UPLOAD && input.isLocalFile) {
      const file = filesDict[input.fieldKey ?? ""];
      if (!file) throw new BadRequestException("File not found for upload");
      media.url = await this.awsS3Service.upload(file);
      log.recordUpload(media.url);
      media.isLocalFile = true;
      media.originalName = file.originalname;
      media.size = file.size;
    } else {
      media.url = input.url?.trim() || "";
      media.isLocalFile = false;
    }
    return tx.saveMedia(media);
  }

  private async upsertMedia(
    input: MediaItemDto,
    sectionId: string,
    filesDict: FilesDict,
    tx: ImageSectionTransaction,
    log: MediaChangeLog,
  ): Promise<MediaItemEntity> {
    const existing = input.id ? await tx.findMedia(input.id) : null;
    // A mídia precisa ser desta publicação: não se edita a de outra por id.
    if (!existing || existing.targetId !== sectionId) {
      throw new NotFoundException(`Mídia com id=${input.id} não encontrada`);
    }

    const media = this.mediaItemProcessor.buildBaseMediaItem(
      input,
      sectionId,
      MediaTargetType.ImagesPage,
    );
    media.id = existing.id;

    if (input.uploadType === UploadType.UPLOAD && input.isLocalFile) {
      const file = filesDict[input.fieldKey ?? ""];
      if (file) {
        if (existing.isLocalFile) log.recordObsolete(existing.url);
        media.url = await this.awsS3Service.upload(file);
        log.recordUpload(media.url);
        media.isLocalFile = true;
        media.originalName = file.originalname;
        media.size = file.size;
      } else {
        media.url = existing.url;
        media.isLocalFile = existing.isLocalFile;
        media.originalName = existing.originalName;
        media.size = existing.size;
      }
    } else {
      media.url = input.url?.trim() || existing.url;
      const sameObject = media.url === existing.url;
      media.isLocalFile = sameObject ? existing.isLocalFile : false;
      if (existing.isLocalFile && !sameObject) log.recordObsolete(existing.url);
    }
    return tx.saveMedia(media);
  }
}
