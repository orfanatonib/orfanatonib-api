import { Injectable, Logger } from "@nestjs/common";
import { errorMessage } from "src/common/utils/validation-message.util";
import { RouteEntity } from "../route-page.entity";
import { RouteRepository } from "../route-page.repository";
import { RouteExistenceRepository } from "../route-existence.repository";
import { ROUTE_ENTITY_TARGETS } from "../route-entity-targets.constants";

export interface OrphanRouteSummary {
  id: string;
  path: string;
  entityType: string;
  entityId: string;
  idToFetch: string;
  title: string;
}

@Injectable()
export class CleanupOrphanRoutesService {
  private readonly logger = new Logger(CleanupOrphanRoutesService.name);

  constructor(
    private readonly routeRepo: RouteRepository,
    private readonly existence: RouteExistenceRepository,
  ) {}

  /**
   * Rota é órfã quando o tipo é desconhecido ou a entidade que ela aponta
   * (`idToFetch`) não existe mais. Um único algoritmo serve à remoção e à listagem.
   */
  private async detectOrphans(): Promise<{
    totalRoutes: number;
    orphans: RouteEntity[];
  }> {
    const allRoutes = await this.routeRepo.find({
      order: { createdAt: "ASC" },
    });

    const routesByType = new Map<string, RouteEntity[]>();
    for (const route of allRoutes) {
      const group = routesByType.get(route.entityType) ?? [];
      group.push(route);
      routesByType.set(route.entityType, group);
    }

    const orphans: RouteEntity[] = [];
    for (const [entityType, routes] of routesByType.entries()) {
      const target = ROUTE_ENTITY_TARGETS[entityType];
      if (!target) {
        this.logger.warn(
          `Unknown entity type: ${entityType} - marking ${routes.length} route(s) as orphan`,
        );
        orphans.push(...routes);
        continue;
      }

      const existingIds = await this.existence.findExistingIds(target, [
        ...new Set(routes.map((route) => String(route.idToFetch))),
      ]);

      for (const route of routes) {
        if (existingIds.has(String(route.idToFetch))) continue;
        orphans.push(route);
        this.logger.warn(
          `Orphan route found: ID=${route.id}, path="${route.path}", entityType=${route.entityType}, idToFetch=${route.idToFetch}`,
        );
      }
    }

    return { totalRoutes: allRoutes.length, orphans };
  }

  async cleanupOrphanRoutes(): Promise<{
    totalRoutes: number;
    orphanRoutes: number;
    deletedRoutes: string[];
    errors: Array<{ routeId: string; error: string }>;
  }> {
    const { totalRoutes, orphans } = await this.detectOrphans();
    const deletedRoutes: string[] = [];
    const errors: Array<{ routeId: string; error: string }> = [];

    for (const route of orphans) {
      try {
        await this.routeRepo.remove(route);
        deletedRoutes.push(route.id);
      } catch (error: unknown) {
        const message = errorMessage(error) || "Unknown error";
        errors.push({ routeId: route.id, error: message });
        this.logger.error(`Error deleting route ID=${route.id}: ${message}`);
      }
    }

    return {
      totalRoutes,
      orphanRoutes: orphans.length,
      deletedRoutes,
      errors,
    };
  }

  async findOrphanRoutes(): Promise<{
    totalRoutes: number;
    orphanRoutes: OrphanRouteSummary[];
  }> {
    const { totalRoutes, orphans } = await this.detectOrphans();
    return {
      totalRoutes,
      orphanRoutes: orphans.map((route) => ({
        id: route.id,
        path: route.path,
        entityType: route.entityType,
        entityId: route.entityId,
        idToFetch: route.idToFetch,
        title: route.title,
      })),
    };
  }
}
