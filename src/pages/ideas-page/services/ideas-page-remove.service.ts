import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, In, QueryRunner } from 'typeorm';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { RouteService } from 'src/route/route.service';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { IdeasPageRepository } from '../repositories/ideas-page.repository';
import { IdeasSectionEntity } from '../../ideas-section/entites/ideas-section.entity';
import { IdeasPageEntity } from '../entities/ideas-page.entity';
import { RouteEntity } from 'src/route/route-page.entity';
import { MediaItemEntity } from 'src/share/media/media-item/media-item.entity';

@Injectable()
export class IdeasPageRemoveService {
  private readonly logger = new Logger(IdeasPageRemoveService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly pageRepo: IdeasPageRepository,
    private readonly routeService: RouteService,
    private readonly awsS3Service: AwsS3Service,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {
  }

  async removeIdeasPage(id: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const page = await this.pageRepo.findOnePageById(id);
      if (!page) {
        throw new NotFoundException(`Ideas page with id ${id} not found`);
      }

      const sectionIds = page.sections?.map(s => s.id) || [];

      if (sectionIds.length > 0) {
        const mediaItems = await this.validateMedia(sectionIds);

        await this.mediaItemProcessor.deleteMediaItems(mediaItems, this.awsS3Service.delete.bind(this.awsS3Service));
      } else {
      }

      if (page.route?.id) {
        await queryRunner.manager.save(IdeasPageEntity, { id: page.id, route: null });

        await queryRunner.manager.delete(RouteEntity, { id: page.route.id });

      } else {
      }

      await queryRunner.manager.remove(page);

      const remainingSections = await queryRunner.manager.find(IdeasSectionEntity, {
        where: sectionIds.length ? { id: In(sectionIds) } : undefined,
      });

      if (remainingSections.length > 0) {
        throw new BadRequestException('Failed to remove all associated sections');
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      this.logger.error('Error removing ideas page. Rolling back.', error);
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Error removing ideas page.');
    } finally {
      await queryRunner.release();
    }
  }

  private async validateMedia(sectionIds: string[]): Promise<MediaItemEntity[]> {
    const mediaItems = await this.mediaItemProcessor.findManyMediaItemsByTargets(sectionIds, 'IdeasSection');

    return mediaItems;
  }
}
