import {
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { MediaItemEntity } from 'src/share/media/media-item/media-item.entity';
import { ImagePageRepository } from '../repository/image-page.repository';
import { ImagePageResponseDto } from '../dto/image-page-response.dto';
import { PaginatedImageSectionResponseDto } from '../dto/paginated-image-section.dto';
import { ImageSectionRepository } from 'src/pages/image-section/repository/image-section.repository';
import { Request } from 'express';
import { AuthContextService } from 'src/auth/services/auth-context.service';

@Injectable()
export class ImagePageGetService {
    private readonly logger = new Logger(ImagePageGetService.name);

    constructor(
        private readonly imagePageRepository: ImagePageRepository,
        private readonly sectionRepository: ImageSectionRepository,
        private readonly mediaItemProcessor: MediaItemProcessor,
        private readonly authContext: AuthContextService,

    ) {
    }

    async findAll(): Promise<ImagePageResponseDto[]> {
        const pages = await this.imagePageRepository.findAllWithSections();

        const sectionIds = pages.flatMap((page) => page.sections.map((s) => s.id));
        const mediaItems = await this.mediaItemProcessor.findManyMediaItemsByTargets(sectionIds, 'ImagesPage');

        const mediaMap = new Map<string, MediaItemEntity[]>();
        for (const item of mediaItems) {
            if (!mediaMap.has(item.targetId)) mediaMap.set(item.targetId, []);
            mediaMap.get(item.targetId)!.push(item);
        }

        const result = pages.map((page) => ImagePageResponseDto.fromEntity(page, mediaMap));
        return result;
    }

    async findOne(id: string): Promise<ImagePageResponseDto> {
        const page = await this.imagePageRepository.findByIdWithSections(id);
        if (!page) {
            this.logger.warn(`Page with ID ${id} not found`);
            throw new NotFoundException('Gallery page not found.');
        }

        if (!page.route) {
            this.logger.warn(`Route not found for page ID: ${id}`);
            throw new NotFoundException(`A galeria com id ${id} não possui rota associada.`);
        }

        const sectionIds = page.sections.map((s) => s.id);
        const media = await this.mediaItemProcessor.findManyMediaItemsByTargets(sectionIds, 'ImagesPage');

        const mediaMap = new Map<string, MediaItemEntity[]>();
        for (const item of media) {
            if (!mediaMap.has(item.targetId)) mediaMap.set(item.targetId, []);
            mediaMap.get(item.targetId)!.push(item);
        }

        const result = ImagePageResponseDto.fromEntity(page, mediaMap);
        return result;
    }

    async findSectionsPaginated(
        pageId: string,
        page: number,
        limit: number,
        req: Request,
    ): Promise<PaginatedImageSectionResponseDto> {
        const offset = (page - 1) * limit;

        const loggedIn = await this.authContext.isLoggedIn(req);

        const imagePage = await this.imagePageRepository.findById(pageId);
        if (!imagePage) {
            this.logger.warn(`Page with ID ${pageId} not found`);
            throw new NotFoundException(
                `Página de galeria com ID ${pageId} não encontrada.`,
            );
        }

        const where: any = { page: { id: pageId } };

        if (!loggedIn) {
            where.public = true;
        }

        const [sections, total] = await this.sectionRepository.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            skip: offset,
            take: limit,
        });

        const sectionIds = sections.map((section) => section.id);
        const mediaItems =
            await this.mediaItemProcessor.findManyMediaItemsByTargets(
                sectionIds,
                'ImagesPage',
            );
        const mediaMap = this.groupMediaBySectionId(mediaItems);

        return PaginatedImageSectionResponseDto.fromEntities(
            imagePage,
            sections,
            mediaMap,
            page,
            limit,
            total,
        );
    }


    private groupMediaBySectionId(mediaItems: MediaItemEntity[]): Map<string, MediaItemEntity[]> {
        const map = new Map<string, MediaItemEntity[]>();

        for (const item of mediaItems) {
            if (!map.has(item.targetId)) {
                map.set(item.targetId, []);
            }
            map.get(item.targetId)!.push(item);
        }

        return map;
    }
}
