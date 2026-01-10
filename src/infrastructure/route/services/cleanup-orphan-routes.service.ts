import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { RouteEntity } from '../route-page.entity';
import { RouteRepository } from '../route-page.repository';
import { ShelterEntity } from 'src/shelter/shelter/entities/shelter.entity/shelter.entity';
import { MeditationEntity } from 'src/content/meditation/entities/meditation.entity';
import { DayEntity } from 'src/content/meditation/entities/day.entity';
import { EventEntity } from 'src/content/event/entities/event.entity';
import { DocumentEntity } from 'src/content/document/entities/document.entity';
import { VisitMaterialsPageEntity } from 'src/content/page/visit-material-page/entities/visit-material-page.entity';
import { VideosPage } from 'src/content/page/video-page/entities/video-page.entity';
import { ImagePageEntity } from 'src/content/page/image-page/entity/Image-page.entity';
import { IdeasPageEntity } from 'src/content/page/ideas-page/entities/ideas-page.entity';
import { InformativeEntity } from 'src/content/informative/entities/informative.entity';

const ENTITY_TYPE_MAP: Record<string, { entity: any; tableName: string; checkMethod?: 'entity' | 'meditation' }> = {
  'shelterPage': { entity: ShelterEntity, tableName: 'shelters' },
  'ShelterPage': { entity: ShelterEntity, tableName: 'shelters' },
  'ShelterEntity': { entity: ShelterEntity, tableName: 'shelters' },
  'Meditation': { entity: MeditationEntity, tableName: 'meditations' },
  'MeditationDay': { entity: DayEntity, tableName: 'meditation_days', checkMethod: 'meditation' },
  'Event': { entity: EventEntity, tableName: 'events' },
  'Document': { entity: DocumentEntity, tableName: 'documents' },
  'VisitMaterialsPage': { entity: VisitMaterialsPageEntity, tableName: 'visit_materials_pages' },
  'VideosPage': { entity: VideosPage, tableName: 'videos_pages' },
  'ImagesPage': { entity: ImagePageEntity, tableName: 'images_pages' },
  'IdeasPage': { entity: IdeasPageEntity, tableName: 'ideas_pages' },
  'Informative': { entity: InformativeEntity, tableName: 'informatives' },
};

@Injectable()
export class CleanupOrphanRoutesService {
  private readonly logger = new Logger(CleanupOrphanRoutesService.name);

  constructor(
    private readonly routeRepo: RouteRepository,
    private readonly dataSource: DataSource,
  ) {}

  async cleanupOrphanRoutes(): Promise<{
    totalRoutes: number;
    orphanRoutes: number;
    deletedRoutes: string[];
    errors: Array<{ routeId: string; error: string }>;
  }> {

    const allRoutes = await this.routeRepo.find({
      order: { createdAt: 'ASC' },
    });

    const orphanRoutes: RouteEntity[] = [];
    const deletedRoutes: string[] = [];
    const errors: Array<{ routeId: string; error: string }> = [];

    const routesByType = new Map<string, RouteEntity[]>();
    for (const route of allRoutes) {
      if (!routesByType.has(route.entityType)) {
        routesByType.set(route.entityType, []);
      }
      routesByType.get(route.entityType)!.push(route);
    }

    for (const [entityType, routes] of routesByType.entries()) {
      const entityConfig = ENTITY_TYPE_MAP[entityType];
      if (!entityConfig) {
        this.logger.warn(`Unknown entity type: ${entityType} - marking ${routes.length} route(s) as orphan`);
        orphanRoutes.push(...routes);
        continue;
      }

      const idsToCheck = routes.map(r => r.idToFetch);
      const uniqueIdsToCheck = [...new Set(idsToCheck)];

      if (uniqueIdsToCheck.length === 0) {
        orphanRoutes.push(...routes);
        continue;
      }

      let existingEntities: any[] = [];

      if (entityConfig.checkMethod === 'meditation') {
        const repository = this.dataSource.getRepository(MeditationEntity);
        const entities = await repository.find({
          where: { id: In(uniqueIdsToCheck) },
          select: ['id'],
        });
        existingEntities = entities.map(e => ({ id: String(e.id) }));
      } else {
        const repository = this.dataSource.getRepository(entityConfig.entity);
        const entities = await repository.find({
          where: { id: In(uniqueIdsToCheck) },
          select: ['id'],
        });
        existingEntities = entities.map(e => ({ id: String(e.id) }));
      }

      const existingIds = new Set(existingEntities.map((e: any) => String(e.id)));

      for (const route of routes) {
        const idToFetchStr = String(route.idToFetch);
        if (!existingIds.has(idToFetchStr)) {
          orphanRoutes.push(route);
          this.logger.warn(`Orphan route found: ID=${route.id}, path="${route.path}", entityType=${route.entityType}, idToFetch=${route.idToFetch}`);
        }
      }
    }


    if (orphanRoutes.length > 0) {

      for (const route of orphanRoutes) {
        const routeId = route.id;
        try {
          await this.routeRepo.remove(route);
          deletedRoutes.push(routeId);
        } catch (error: any) {
          const errorMsg = error.message || 'Unknown error';
          errors.push({ routeId, error: errorMsg });
          this.logger.error(`Error deleting route ID=${routeId}: ${errorMsg}`);
        }
      }
    }


    return {
      totalRoutes: allRoutes.length,
      orphanRoutes: orphanRoutes.length,
      deletedRoutes,
      errors,
    };
  }

  async findOrphanRoutes(): Promise<{
    totalRoutes: number;
    orphanRoutes: Array<{
      id: string;
      path: string;
      entityType: string;
      entityId: string;
      idToFetch: string;
      title: string;
    }>;
  }> {
    const allRoutes = await this.routeRepo.find({
      order: { createdAt: 'ASC' },
    });

    const orphanRoutes: Array<{
      id: string;
      path: string;
      entityType: string;
      entityId: string;
      idToFetch: string;
      title: string;
    }> = [];

    const routesByType = new Map<string, RouteEntity[]>();
    for (const route of allRoutes) {
      if (!routesByType.has(route.entityType)) {
        routesByType.set(route.entityType, []);
      }
      routesByType.get(route.entityType)!.push(route);
    }

    for (const [entityType, routes] of routesByType.entries()) {
      const entityConfig = ENTITY_TYPE_MAP[entityType];
      if (!entityConfig) {
        for (const route of routes) {
          orphanRoutes.push({
            id: route.id,
            path: route.path,
            entityType: route.entityType,
            entityId: route.entityId,
            idToFetch: route.idToFetch,
            title: route.title,
          });
        }
        continue;
      }

      const idsToCheck = routes.map(r => r.idToFetch);
      const uniqueIdsToCheck = [...new Set(idsToCheck)];

      if (uniqueIdsToCheck.length === 0) {
        for (const route of routes) {
          orphanRoutes.push({
            id: route.id,
            path: route.path,
            entityType: route.entityType,
            entityId: route.entityId,
            idToFetch: route.idToFetch,
            title: route.title,
          });
        }
        continue;
      }

      let existingEntities: any[] = [];

      if (entityConfig.checkMethod === 'meditation') {
        const repository = this.dataSource.getRepository(MeditationEntity);
        const entities = await repository.find({
          where: { id: In(uniqueIdsToCheck) },
          select: ['id'],
        });
        existingEntities = entities.map(e => ({ id: String(e.id) }));
      } else {
        const repository = this.dataSource.getRepository(entityConfig.entity);
        const entities = await repository.find({
          where: { id: In(uniqueIdsToCheck) },
          select: ['id'],
        });
        existingEntities = entities.map(e => ({ id: String(e.id) }));
      }

      const existingIds = new Set(existingEntities.map((e: any) => String(e.id)));

      for (const route of routes) {
        const idToFetchStr = String(route.idToFetch);
        if (!existingIds.has(idToFetchStr)) {
          orphanRoutes.push({
            id: route.id,
            path: route.path,
            entityType: route.entityType,
            entityId: route.entityId,
            idToFetch: route.idToFetch,
            title: route.title,
          });
        }
      }
    }

    return {
      totalRoutes: allRoutes.length,
      orphanRoutes,
    };
  }
}
