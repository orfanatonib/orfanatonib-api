import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { DataSource, QueryRunner } from "typeorm";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { RouteType } from "src/infrastructure/route/route-page.entity";
import { CreateInformativeDto } from "../dto/create-informative.dto";
import { INFORMATIVE_ROUTE_PREFIX } from "../constants";
import { InformativeRepository } from "../informative.repository";
import { InformativeEntity } from "../entities/informative.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";

@Injectable()
export class CreateInformativeService {
  private readonly logger = new Logger(CreateInformativeService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly informativeRepo: InformativeRepository,
    private readonly routeService: RouteService,
  ) {}

  async createInformative(
    dto: CreateInformativeDto,
  ): Promise<InformativeEntity> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      const informative = await this.persistInformative(runner, dto);
      await this.attachRoute(runner, informative, dto);

      await runner.commitTransaction();

      return informative;
    } catch (err) {
      await runner.rollbackTransaction();
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(
        "Transaction rolled back",
        err instanceof Error ? err.stack : reason,
      );
      throw new BadRequestException(
        `Error creating informative banner: ${reason}`,
      );
    } finally {
      await runner.release();
    }
  }

  private async persistInformative(
    runner: QueryRunner,
    dto: CreateInformativeDto,
  ): Promise<InformativeEntity> {
    const repo = runner.manager.getRepository(InformativeEntity);
    const entity = repo.create({
      title: dto.title,
      description: dto.description,
      public: dto.public,
    });
    return repo.save(entity);
  }

  private async attachRoute(
    runner: QueryRunner,
    informative: InformativeEntity,
    dto: CreateInformativeDto,
  ): Promise<void> {
    const path = await this.routeService.generateAvailablePath(
      dto.title,
      INFORMATIVE_ROUTE_PREFIX,
    );

    const route = await this.routeService.createRouteWithManager(
      runner.manager,
      {
        title: dto.title,
        subtitle: dto.description,
        description: dto.description,
        path,
        type: RouteType.OTHER,
        entityId: informative.id,
        idToFetch: informative.id,
        entityType: MediaTargetType.Informative,
        image: "",
        public: dto.public,
      },
    );

    informative.route = route;
    await runner.manager.save(informative);
  }
}
