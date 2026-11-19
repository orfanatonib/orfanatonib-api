import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource, QueryRunner } from "typeorm";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import {
  UploadType,
  MediaItemEntity,
} from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { ImageSectionRepository } from "../repositories/image-section.repository";
import { ImagePageRepository } from "src/content/page/image-page/repositories/image-page.repository";
import { UpdateImageSectionDto } from "../dto/update-image-section.dto";
import { MediaItemDto } from "src/shared/dto/media-item-dto";
import { ImageSectionResponseDto } from "../dto/image-section-response.dto";

@Injectable()
export class UpdateImageSectionService {
  private readonly logger = new Logger(UpdateImageSectionService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly awsS3Service: AwsS3Service,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly sectionRepo: ImageSectionRepository,
    private readonly pageRepo: ImagePageRepository,
  ) {}

  async updateSection(
    id: string,
    dto: UpdateImageSectionDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<ImageSectionResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const tracking: FileTracking = { pendingNew: [], replaced: [] };
    let committed = false;

    try {
      const section = await this.sectionRepo.findOne({
        where: { id },
        relations: ["author"],
      });
      if (!section) {
        throw new NotFoundException("Section not found");
      }

      const targetPageId =
        dto.pageId ?? this.configService.get<string>("FEED_ORFANATO_PAGE_ID");
      // `findOneBy({ id: undefined })` casaria com qualquer galeria: exige id.
      const page = targetPageId
        ? await this.pageRepo.findOneBy({ id: targetPageId })
        : null;
      if (!page) {
        throw new NotFoundException("Default page not found");
      }

      const existingMedia =
        await this.mediaItemProcessor.findManyMediaItemsByTargets(
          [section.id],
          MediaTargetType.ImagesPage,
        );

      // Ordem segura (plano 32, P0): objeto novo → linha → commit → só então some o
      // antigo. Apagar antes deixava a linha apontando para um objeto inexistente se
      // um passo seguinte falhasse.
      const processedMedia = await this.processMedia(
        dto.mediaItems,
        section.id,
        filesDict,
        queryRunner,
        tracking,
      );
      section.caption = dto.caption;
      section.description = dto.description;
      section.public = dto.public || false;
      section.page = page;
      const savedSection = await queryRunner.manager.save(section);

      await queryRunner.commitTransaction();
      committed = true;

      await this.deleteObsoleteMedia(existingMedia, dto.mediaItems);
      await this.discardObjects(tracking.replaced);
      return ImageSectionResponseDto.fromEntity(savedSection, processedMedia);
    } catch (error) {
      if (!committed) await queryRunner.rollbackTransaction();
      // O que subiu e ainda não tem linha é órfão; o que já foi trocado numa linha
      // gravada deixa o objeto antigo sem referência.
      await this.discardObjects([...tracking.pendingNew, ...tracking.replaced]);
      this.logger.error("Error updating section", error);
      throw new BadRequestException("Error updating section");
    } finally {
      await queryRunner.release();
    }
  }

  private async deleteObsoleteMedia(
    existingMedia: MediaItemEntity[],
    incomingMedia: MediaItemDto[],
  ): Promise<void> {
    const incomingIds = incomingMedia
      .map((m) => m.id)
      .filter((id): id is string => !!id);
    const toRemove = existingMedia.filter((m) => !incomingIds.includes(m.id));

    if (toRemove.length > 0) {
      await this.mediaItemProcessor.deleteMediaItems(toRemove, async (url) => {
        await this.awsS3Service.delete(url);
      });
    }
  }

  private async processMedia(
    mediaItems: MediaItemDto[],
    sectionId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
    tracking: FileTracking,
  ): Promise<MediaItemEntity[]> {
    const processed: MediaItemEntity[] = [];

    for (const mediaInput of mediaItems) {
      if (mediaInput.id) {
        const updated = await this.upsertMedia(
          mediaInput,
          sectionId,
          filesDict,
          queryRunner,
          tracking,
        );
        processed.push(updated);
      } else {
        const created = await this.addMedia(
          mediaInput,
          sectionId,
          filesDict,
          queryRunner,
          tracking,
        );
        processed.push(created);
      }
    }
    return processed;
  }

  private async addMedia(
    mediaInput: MediaItemDto,
    sectionId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
    tracking: FileTracking,
  ): Promise<MediaItemEntity> {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      mediaInput,
      sectionId,
      MediaTargetType.ImagesPage,
    );

    if (mediaInput.uploadType === UploadType.UPLOAD && mediaInput.isLocalFile) {
      const file = filesDict[mediaInput.fieldKey ?? ""];
      if (!file) {
        throw new BadRequestException("File not found for upload");
      }
      media.url = await this.awsS3Service.upload(file);
      tracking.pendingNew.push(media.url);
      media.isLocalFile = true;
      media.originalName = file.originalname;
      media.size = file.size;
    } else {
      media.url = mediaInput.url?.trim() || "";
      media.isLocalFile = false;
    }

    const saved = await this.mediaItemProcessor.saveMediaItem(media);
    this.markPersisted(media.url, tracking);
    return saved;
  }

  private async upsertMedia(
    mediaInput: MediaItemDto,
    sectionId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
    tracking: FileTracking,
  ): Promise<MediaItemEntity> {
    const existingMedia = await queryRunner.manager.findOneBy(MediaItemEntity, {
      id: mediaInput.id,
    });
    if (!existingMedia) {
      throw new NotFoundException(
        `Mídia com id=${mediaInput.id} não encontrada`,
      );
    }

    const updatedMedia = this.mediaItemProcessor.buildBaseMediaItem(
      mediaInput,
      sectionId,
      MediaTargetType.ImagesPage,
    );
    updatedMedia.id = existingMedia.id;

    if (mediaInput.uploadType === UploadType.UPLOAD && mediaInput.isLocalFile) {
      const file = filesDict[mediaInput.fieldKey ?? ""];
      if (file) {
        updatedMedia.url = await this.awsS3Service.upload(file);
        tracking.pendingNew.push(updatedMedia.url);
        updatedMedia.isLocalFile = true;
        updatedMedia.originalName = file.originalname;
        updatedMedia.size = file.size;
      } else {
        updatedMedia.url = existingMedia.url;
        updatedMedia.isLocalFile = existingMedia.isLocalFile;
        updatedMedia.originalName = existingMedia.originalName;
        updatedMedia.size = existingMedia.size;
      }
    } else {
      updatedMedia.url = mediaInput.url?.trim() || existingMedia.url;
      updatedMedia.isLocalFile = false;
    }

    const saved = await this.mediaItemProcessor.upsertMediaItem(
      mediaInput.id,
      updatedMedia,
    );
    this.markPersisted(updatedMedia.url, tracking);
    // O arquivo antigo só sai de cena se a linha deixou de apontar para ele.
    if (
      existingMedia.isLocalFile &&
      existingMedia.url &&
      existingMedia.url !== updatedMedia.url
    ) {
      tracking.replaced.push(existingMedia.url);
    }
    return saved;
  }

  /** A linha já referencia o objeto novo: ele deixa de ser candidato a órfão. */
  private markPersisted(url: string | undefined, tracking: FileTracking): void {
    tracking.pendingNew = tracking.pendingNew.filter((u) => u !== url);
  }

  /** Melhor esforço: objeto não apagado vira registro, não falha da requisição. */
  private async discardObjects(urls: readonly string[]): Promise<void> {
    for (const url of urls) {
      try {
        await this.awsS3Service.delete(url);
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Objeto não apagado do bucket (${url}): ${reason}`);
      }
    }
  }
}

/** `pendingNew`: subiu e ainda sem linha. `replaced`: antigo já sem referência. */
interface FileTracking {
  pendingNew: string[];
  replaced: string[];
}
