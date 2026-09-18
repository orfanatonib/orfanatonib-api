import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { UploadType } from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { ImageSectionRepository } from "../repositories/image-section.repository";
import { CreateImageSectionDto } from "../dto/create-image-section.dto";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { ImageSectionResponseDto } from "../dto/image-section-response.dto";
import { ImageSectionEntity } from "src/content/page/image-page/entities/image-section.entity";

@Injectable()
export class CreateImageSectionService {
  private readonly logger = new Logger(CreateImageSectionService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly awsS3Service: AwsS3Service,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly imageSectionRepository: ImageSectionRepository,
  ) {}

  async createSection(
    dto: CreateImageSectionDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<ImageSectionResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const section = queryRunner.manager.create(ImageSectionEntity, {
        caption: dto.caption,
        description: dto.description,
        public: dto.public || false,
        page: null,
      });

      const savedSection = await queryRunner.manager.save(section);

      this.validateFiles(dto, filesDict);

      const preparedMediaItems = dto.mediaItems.map((item) => ({
        ...item,
        fileField: item.fieldKey,
      }));

      const mediaItems: MediaItemEntity[] =
        await this.mediaItemProcessor.processMediaItemsPolymorphic(
          preparedMediaItems,
          savedSection.id,
          MediaTargetType.ImagesPage,
          filesDict,
          this.awsS3Service.upload.bind(this.awsS3Service),
        );

      await queryRunner.commitTransaction();

      return ImageSectionResponseDto.fromEntity(savedSection, mediaItems);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error("Error creating section", error);
      throw new BadRequestException("Error creating section");
    } finally {
      await queryRunner.release();
    }
  }

  private validateFiles(
    dto: CreateImageSectionDto,
    filesDict: Record<string, Express.Multer.File>,
  ) {
    for (const media of dto.mediaItems) {
      if (media.uploadType === UploadType.UPLOAD && media.isLocalFile) {
        if (!media.originalName) {
          throw new BadRequestException("Campo originalName ausente");
        }
        if (!media.fieldKey || !filesDict[media.fieldKey]) {
          throw new BadRequestException(
            `Arquivo não encontrado para fieldKey: ${media.fieldKey}`,
          );
        }
      }
    }
  }
}
