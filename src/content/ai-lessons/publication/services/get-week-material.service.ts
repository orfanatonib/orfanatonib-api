import { Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from 'src/common/exceptions';
import { GetVisitMaterialPageService } from 'src/content/page/visit-material-page/services/get-visit-material-page.service';
import { VisitMaterialsPageResponseDTO } from 'src/content/page/visit-material-page/dto/visit-material-page-response.dto';
import { AppNotFoundException, ErrorCode } from '../../compat/exceptions';
import type { LessonPublicationDuplicate } from '../../types/lesson-generation.types';
import type { StudioPublicationSearch, StudioPublicationDuplicateQuery } from '../types';
@Injectable()
export class WeekMaterialsPageGetService {
  constructor(private readonly get: GetVisitMaterialPageService) {}
  async findOnePage(id: string): Promise<VisitMaterialsPageResponseDTO> {
    try { return await this.get.findOne(id); }
    catch (error: unknown) {
      if (error instanceof ResourceNotFoundException) throw new AppNotFoundException(ErrorCode.LESSON_NOT_FOUND, 'Material de visita não encontrado.');
      throw error;
    }
  }
  findOneBySourceLessonId(id: string): Promise<VisitMaterialsPageResponseDTO | null> { return this.get.findBySourceLessonId(id); }
  async findAllPaginated(query: StudioPublicationSearch): Promise<{ data: VisitMaterialsPageResponseDTO[] }> {
    return { data: (await this.get.findAll({ searchString: query.searchString })).slice(0, query.limit ?? 20) };
  }
  async findPossibleDuplicates(query: StudioPublicationDuplicateQuery): Promise<LessonPublicationDuplicate[]> {
    return (await this.get.findAll({ searchString: query.title })).filter((page) => page.id !== query.excludePageId)
      .slice(0, 20).map((page) => ({ id: page.id, title: page.title, routePath: page.route?.path ?? null }));
  }
}
