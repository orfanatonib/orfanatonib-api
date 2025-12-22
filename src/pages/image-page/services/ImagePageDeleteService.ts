import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { RouteService } from 'src/route/route.service';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { ImagePageRepository } from '../repository/image-page.repository';

@Injectable()
export class ImagePageDeleteService {
    private readonly logger = new Logger(ImagePageDeleteService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly imagePageRepository: ImagePageRepository,
        private readonly routeService: RouteService,
        private readonly awsS3Service: AwsS3Service,
        private readonly mediaItemProcessor: MediaItemProcessor,
        private readonly configService: ConfigService,
    ) {
    }

    async removePage(id: string): Promise<void> {
        
        const protectedPageId = this.configService.get<string>('FEED_ORFANATO_PAGE_ID');
        if (protectedPageId && id === protectedPageId) {
            this.logger.warn(`Attempt to delete protected page: ID=${id}`);
            throw new ForbiddenException('This page cannot be deleted as it is the orphanage feed page.');
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const page = await this.imagePageRepository.findByIdWithSections(id);
            if (!page) {
                throw new NotFoundException(`Página com id ${id} não encontrada`);
            }

            const sectionIds = page.sections?.map((s) => s.id) || [];
            if (sectionIds.length > 0) {
                const media = await this.mediaItemProcessor.findManyMediaItemsByTargets(sectionIds, 'ImagesPage');
                await this.mediaItemProcessor.deleteMediaItems(media, this.awsS3Service.delete.bind(this.awsS3Service));
            } else {
            }

            if (page.route?.id) {
                await this.routeService.removeRoute(page.route.id);
            } else {
            }

            await queryRunner.manager.remove(page);

            await queryRunner.commitTransaction();
        } catch (error) {
            this.logger.error('Error removing gallery. Rolling back.', error);
            await queryRunner.rollbackTransaction();
            throw new BadRequestException('Erro ao remover a galeria.');
        } finally {
            await queryRunner.release();
        }
    }
}
