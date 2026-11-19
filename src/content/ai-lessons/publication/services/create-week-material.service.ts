import { Injectable } from '@nestjs/common';
import { CreateVisitMaterialPageService } from 'src/content/page/visit-material-page/services/create-visit-material-page.service';
import { CreateWeekMaterialsPageDto } from '../dto/create-week-material.dto';
import { VisitMaterialsPageResponseDTO } from 'src/content/page/visit-material-page/dto/visit-material-page-response.dto';
import type { StudioPublicationRouteOptions } from '../types';
@Injectable()
export class WeekMaterialsPageCreateService {
  constructor(private readonly create: CreateVisitMaterialPageService) {}
  createWeekMaterialsPage(dto: CreateWeekMaterialsPageDto, files: Record<string, Express.Multer.File>, _options?: StudioPublicationRouteOptions): Promise<VisitMaterialsPageResponseDTO> {
    return this.create.execute(dto, files);
  }
}
