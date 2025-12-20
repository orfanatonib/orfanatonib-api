import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { MediaItemEntity } from 'src/share/media/media-item/media-item.entity';
import { MediaTargetType } from 'src/share/media/media-target-type.enum';
import { ImageSectionRepository } from '../repository/image-section.repository';

@Injectable()
export class ImageSectionDeleteService {
  private readonly logger = new Logger(ImageSectionDeleteService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly sectionRepository: ImageSectionRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  async deleteSection(id: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const section = await this.sectionRepository.findOneBy({ id });

      if (!section) {
        throw new NotFoundException(`Seção com id=${id} não encontrada`);
      }

      const mediaItems: MediaItemEntity[] = await this.mediaItemProcessor.findMediaItemsByTarget(
        section.id,
        MediaTargetType.ImagesPage,
      );

      if (mediaItems.length > 0) {
        await this.mediaItemProcessor.deleteMediaItems(
          mediaItems,
          this.awsS3Service.delete.bind(this.awsS3Service),
        );
      } else {
      }

      await queryRunner.manager.remove(section);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error removing section. Rollback executed.', error);
      throw new BadRequestException('Error removing section.');
    } finally {
      await queryRunner.release();
    }
  }
}
