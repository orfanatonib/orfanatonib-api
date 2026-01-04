import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { VisitMaterialsPageRepository } from '../visit-material.repository';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { VisitMaterialsPageResponseDTO } from '../dto/visit-material-response.dto';
import { VisitMaterialsPageEntity } from '../entities/visit-material-page.entity';
import { MediaTargetType } from 'src/shared/media/media-target-type.enum';
import { MediaItemEntity } from 'src/shared/media/media-item/media-item.entity';
import { QueryVisitMaterialsPageDto } from '../dto/query-visit-material-pages.dto';

@Injectable()
export class VisitMaterialsPageGetService {
  private readonly logger = new Logger(VisitMaterialsPageGetService.name);

  constructor(
    private readonly repo: VisitMaterialsPageRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) { }

  async findAllPages(): Promise<VisitMaterialsPageEntity[]> {
    return this.repo.findAllPages();
  }

  async findOnePage(id: string): Promise<VisitMaterialsPageEntity> {
    const page = await this.repo.findOnePageById(id);
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async findPageWithMedia(id: string): Promise<VisitMaterialsPageResponseDTO> {
    const page = await this.findOnePage(id);
    const mediaItems = await this.mediaItemProcessor.findMediaItemsByTarget(
      page.id,
      MediaTargetType.VisitMaterialsPage,
    );
    return VisitMaterialsPageResponseDTO.fromEntity(page, mediaItems);
  }

  async findAllPagesWithMedia(
    query?: QueryVisitMaterialsPageDto,
  ): Promise<VisitMaterialsPageResponseDTO[]> {
    if (query) {
    } else {
    }
    
    const pages = query
      ? await this.repo.findAllPagesWithFilters(query)
      : await this.repo.findAllPages();
    
    const pageIds = pages.map((p) => p.id);
    const allMedia = await this.mediaItemProcessor.findManyMediaItemsByTargets(
      pageIds,
      MediaTargetType.VisitMaterialsPage,
    );

    const grouped = pageIds.reduce((acc, id) => {
      acc[id] = allMedia.filter((m) => m.targetId === id);
      return acc;
    }, {} as Record<string, MediaItemEntity[]>);

    return pages.map((page) =>
      VisitMaterialsPageResponseDTO.fromEntity(page, grouped[page.id] || []),
    );
  }

  async setCurrentWeek(id: string): Promise<any> {

    try {
      const weekPage = await this.repo.findOnePageById(id);

      if (!weekPage) {
        throw new Error(`Página com ID ${id} não encontrada.`);
      }


      const weekPageCurrent = await this.repo.findCurrentWeek();
      if (weekPageCurrent) {
      } else {
      }

      if (weekPageCurrent && weekPageCurrent.id !== weekPage.id) {
        weekPageCurrent.currentWeek = false;
        weekPageCurrent.route.current = false;
        await this.repo.savePage(weekPageCurrent);
      }

      weekPage.currentWeek = true;
      weekPage.route.current = true;
      weekPage.route.public = true;

      await this.repo.savePage(weekPage);

    } catch (error) {
      this.logger.error(`Error setting page as current: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCurrentWeek(): Promise<VisitMaterialsPageEntity | { message: string }> {
    const page = await this.repo.findCurrentWeek();
    if (!page) {
      return { message: 'Nenhuma página da semana atual encontrada.' };
    }
    return page;
  }

}