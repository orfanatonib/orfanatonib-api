import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InformativeRepository } from '../informative.repository';
import { UpdateInformativeDto } from '../dto/update-informative.dto';
import { InformativeEntity } from '../entities/informative.entity';
import { RouteService } from 'src/route/route.service';
import { RouteEntity, RouteType } from 'src/route/route-page.entity';
import { MediaTargetType } from 'src/share/media/media-target-type.enum';

@Injectable()
export class UpdateInformativeService {
  private readonly logger = new Logger(UpdateInformativeService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly informativeRepo: InformativeRepository,
    private readonly routeService: RouteService,
  ) { }

  async execute(id: string, dto: UpdateInformativeDto): Promise<InformativeEntity> {

    const existing = await this.informativeRepo.findOneWithRelations(id);
    if (!existing) {
      this.logger.warn(`Informative banner not found: ID=${id}`);
      throw new NotFoundException('Informative not found.');
    }

    return await this.dataSource.transaction(async (manager) => {
      const updated = manager.merge(InformativeEntity, existing, {
        title: dto.title,
        description: dto.description,
        public: dto.public,
      });

      const saved = await manager.save(InformativeEntity, updated);

      if (saved.route) {
        const updatedRoute = await this.updateRoute(
          saved.route.id,
          dto,
          saved.id,
        );
        saved.route = updatedRoute;
      }

      return saved;
    });
  }

  private async updateRoute(
    routeId: string,
    dto: UpdateInformativeDto,
    informativeId: string,
  ): Promise<RouteEntity> {

    const routeData: Partial<RouteEntity> = {
      title: dto.title,
      subtitle: dto.description,
      description: dto.description,
      idToFetch: informativeId,
      entityType: MediaTargetType.Informative,
      entityId: informativeId,
      public: dto.public,
      type: RouteType.PAGE,
      path: 'informativo_',
      image: '',
    };

    const route = await this.routeService.upsertRoute(routeId, routeData);
    return route;
  }
}