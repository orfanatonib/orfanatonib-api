import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';
import { IdeasSectionRepository } from '../repository/ideas-section.repository';
import { IdeasSectionEntity } from 'src/content/page/ideas-section/entites/ideas-section.entity';
import { MediaItemEntity } from 'src/shared/media/media-item/media-item.entity';
import { MediaTargetType } from 'src/shared/media/media-target-type.enum';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';

@Injectable()
export class IdeasSectionDeleteService {
  private readonly logger = new Logger(IdeasSectionDeleteService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly awsS3Service: AwsS3Service,
    private readonly ideasSectionRepository: IdeasSectionRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) { }

  async deleteSection(id: string): Promise<void> {

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingSection = await queryRunner.manager.findOne(IdeasSectionEntity, {
        where: { id },
      });

      if (!existingSection) {
        throw new NotFoundException(`Seção de ideias com ID=${id} não encontrada`);
      }

      if (existingSection.page) {
        throw new BadRequestException(
          `Seção de ideias ID=${id} está vinculada à página ID=${existingSection.page.id}. ` +
          `Remova a vinculação primeiro ou delete a página.`
        );
      }

      const mediaItems = await queryRunner.manager.find(MediaItemEntity, {
        where: {
          targetId: id,
          targetType: MediaTargetType.IdeasSection,
        },
      });

      for (const media of mediaItems) {
        if (media.isLocalFile && media.url) {
          try {
            await this.awsS3Service.delete(media.url);
          } catch (error) {
            this.logger.warn(`Error deleting file from S3: ${media.url}`, error);
          }
        }
      }

      if (mediaItems.length > 0) {
        await queryRunner.manager.delete(MediaItemEntity, {
          targetId: id,
          targetType: MediaTargetType.IdeasSection,
        });
      }

      await queryRunner.manager.delete(IdeasSectionEntity, { id });

      await queryRunner.commitTransaction();

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error deleting ideas section ID=${id}`, error);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Error deleting ideas section');
    } finally {
      await queryRunner.release();
    }
  }
}
