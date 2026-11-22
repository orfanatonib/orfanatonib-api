import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { InformativeRepository } from "../informative.repository";
import { UpdateInformativeDto } from "../dto/update-informative.dto";
import { InformativeEntity } from "../entities/informative.entity";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { RouteEntity } from "src/infrastructure/route/route-page.entity";
import { INFORMATIVE_ROUTE_PREFIX } from "../constants";

@Injectable()
export class UpdateInformativeService {
  private readonly logger = new Logger(UpdateInformativeService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly informativeRepo: InformativeRepository,
    private readonly routeService: RouteService,
  ) {}

  async execute(
    id: string,
    dto: UpdateInformativeDto,
  ): Promise<InformativeEntity> {
    const existing = await this.informativeRepo.findOneWithRelations(id);
    if (!existing) {
      this.logger.warn(`Informative banner not found: ID=${id}`);
      throw new NotFoundException("Informative not found.");
    }

    return await this.dataSource.transaction(async (manager) => {
      const updated = manager.merge(InformativeEntity, existing, {
        title: dto.title,
        description: dto.description,
        public: dto.public,
      });

      const saved = await manager.save(InformativeEntity, updated);

      if (saved.route) {
        const updatedRoute = await this.updateRoute(saved.route, dto, manager);
        saved.route = updatedRoute;
      }

      return saved;
    });
  }

  /**
   * Só o que mudou, na MESMA transação do banner. O tipo e a ligação com a entidade ficam como nasceram; o caminho
   * é regenerado a partir do título (prefixo `informativo_`) só quando o título muda.
   */
  private async updateRoute(
    route: RouteEntity,
    dto: UpdateInformativeDto,
    manager: EntityManager,
  ): Promise<RouteEntity> {
    // Título repetido não conta como mudança: reenviá-lo regeneraria o caminho (e quebraria o link já publicado).
    const titleChanged = dto.title !== undefined && dto.title !== route.title;
    const routeData: Partial<RouteEntity> = {
      path: INFORMATIVE_ROUTE_PREFIX,
      ...(titleChanged && { title: dto.title }),
      ...(dto.description !== undefined && {
        subtitle: dto.description,
        description: dto.description,
      }),
      ...(dto.public !== undefined && { public: dto.public }),
    };

    return this.routeService.upsertRoute(route.id, routeData, manager);
  }
}
