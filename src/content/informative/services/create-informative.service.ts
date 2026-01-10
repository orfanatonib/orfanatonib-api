import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { RouteService } from 'src/infrastructure/route/route.service';
import { RouteType } from 'src/infrastructure/route/route-page.entity';
import { CreateInformativeDto } from '../dto/create-informative.dto';
import { InformativeRepository } from '../informative.repository';
import { InformativeEntity } from '../entities/informative.entity';
import { MediaTargetType } from 'src/shared/media/media-target-type.enum';

@Injectable()
export class CreateInformativeService {
  private readonly logger = new Logger(CreateInformativeService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly informativeRepo: InformativeRepository,
    private readonly routeService: RouteService,
  ) { }

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
      this.logger.error('Transaction rolled back', err.stack);
      throw new BadRequestException(
        `Error creating informative banner: ${err.message}`,
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
      'informativo_',
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
        image: '',
        public: dto.public,
      },
    );

    informative.route = route;
    await runner.manager.save(informative);
  }
}
