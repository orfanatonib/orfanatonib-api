import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { UploadType } from 'src/share/media/media-item/media-item.entity';
import { IdeasSectionMediaType } from '../enums/ideas-section-media-type.enum';
import { MediaTargetType } from 'src/share/media/media-target-type.enum';
import { IdeasSectionRepository } from '../repository/ideas-section.repository';
import { CreateIdeasSectionDto } from '../dto/create-ideas-section.dto';
import { MediaItemEntity } from 'src/share/media/media-item/media-item.entity';
import { IdeasSectionResponseDto } from '../dto/ideas-section-response.dto';
import { IdeasSectionEntity } from 'src/pages/ideas-page/entities/ideas-section.entity';

@Injectable()
export class IdeasSectionCreateService {
  private readonly logger = new Logger(IdeasSectionCreateService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly awsS3Service: AwsS3Service,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly ideasSectionRepository: IdeasSectionRepository,
  ) { }

  async createSection(
    dto: CreateIdeasSectionDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<IdeasSectionResponseDto> {

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const section = await this.persistOrphanSection(queryRunner, dto);
      await this.processOrphanSectionMedia(section, dto, filesDict);

      await queryRunner.commitTransaction();

      const mediaItems = await queryRunner.manager.find(MediaItemEntity, {
        where: {
          targetId: section.id,
          targetType: MediaTargetType.IdeasSection,
        },
      });

      return IdeasSectionResponseDto.fromEntity(section, mediaItems);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('💥  Transaction rolled‑back', error.stack);
      throw new BadRequestException(`Erro ao criar a seção de ideias: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  private async persistOrphanSection(
    queryRunner: QueryRunner,
    dto: CreateIdeasSectionDto,
  ): Promise<IdeasSectionEntity> {

    const sectionRepo = queryRunner.manager.getRepository(IdeasSectionEntity);

    const section = sectionRepo.create({
      title: dto.title,
      description: dto.description,
      public: dto.public ?? true,
      page: undefined,
    });

    const savedSection = await sectionRepo.save(section);

    return savedSection;
  }

  private async processOrphanSectionMedia(
    section: IdeasSectionEntity,
    dto: CreateIdeasSectionDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<void> {

    if (!dto.medias?.length) {
      return;
    }


    const normalized = dto.medias.map((item) => ({
      ...item,
      mediaType:
        item.mediaType === IdeasSectionMediaType.VIDEO ? 'video' :
          item.mediaType === IdeasSectionMediaType.DOCUMENT ? 'document' :
            'image',
      type: item.uploadType,
      fileField:
        item.uploadType === 'upload' && item.isLocalFile
          ? item.fieldKey
          : undefined,
    }));


    const saved = await this.mediaItemProcessor.processMediaItemsPolymorphic(
      normalized,
      section.id,
      MediaTargetType.IdeasSection,
      filesDict,
      this.awsS3Service.upload.bind(this.awsS3Service),
    );

  }

  private validateFiles(dto: CreateIdeasSectionDto, filesDict: Record<string, Express.Multer.File>) {
    for (const media of dto.medias) {
      if (media.uploadType === UploadType.UPLOAD && media.isLocalFile) {
        if (!media.originalName) {
          throw new BadRequestException('Campo originalName ausente');
        }
        if (!media.fieldKey || !filesDict[media.fieldKey]) {
          throw new BadRequestException(`Arquivo não encontrado para fieldKey: ${media.fieldKey}`);
        }
      }
    }
  }
}
