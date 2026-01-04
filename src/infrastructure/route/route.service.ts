import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { RouteRepository } from './route-page.repository';
import { RouteEntity, RouteType } from './route-page.entity';
import { EntityManager } from 'typeorm';
import { GetMeditationService } from 'src/content/meditation/services/get-meditation.service';

@Injectable()
export class RouteService {
  private readonly logger = new Logger(RouteService.name);

  constructor(
    private readonly routeRepo: RouteRepository,
    private readonly getMeditationService: GetMeditationService

  ) { }

  generateRoute(title: string, prefix: string): string {
    return (
      prefix +
      title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .trim()
    );
  }

  async generateAvailablePath(baseName: string, prefix: string): Promise<string> {
    const basePath = this.generateRoute(baseName, prefix);
    let candidate = basePath;
    let count = 1;

    while (await this.routeRepo.findByPath(candidate)) {
      candidate = `${basePath}_${count++}`;
    }

    return candidate;
  }

  async createRoute(data: {
    title: string;
    public?: boolean;
    subtitle: string;
    idToFetch: string;
    path?: string;
    entityType: string;
    description: string;
    entityId: string;
    type: RouteType;
    image?: string;
    prefix?: string;
  }): Promise<RouteEntity> {
    const path = data.path || (await this.generateAvailablePath(data.title, data.prefix ?? ''));

    const route = new RouteEntity();
    Object.assign(route, {
      title: data.title,
      public: data.public ?? true,
      subtitle: data.subtitle,
      idToFetch: data.idToFetch,
      path,
      entityType: data.entityType,
      description: data.description,
      entityId: data.entityId,
      type: data.type,
      image: data.image || '',
    });

    return this.routeRepo.save(route);
  }

  async updateRoute(id: string, updateData: Partial<Pick<RouteEntity, 'title' | 'description' | 'path' | 'subtitle'>>): Promise<RouteEntity> {
    const route = await this.routeRepo.findOne({ where: { id } });
    if (!route) throw new NotFoundException('Route not found');

    if (updateData.path) {
      const existing = await this.routeRepo.findByPath(updateData.path);
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Route "${updateData.path}" is already in use`);
      }
    }

    Object.assign(route, updateData);
    return this.routeRepo.save(route);
  }

  async findAllRoutes(): Promise<RouteEntity[]> {
    const meditation = await this.getMeditationService.getThisWeekMeditation();
    const routes = await this.routeRepo.find();

    const meditationData = meditation.meditation;
    if (!meditationData) return routes;

    const dayRoutes = meditationData.days.map((day) => ({
      id: day.id,
      title: day.topic,
      subtitle: day.verse,
      description: day.verse,
      path: day.day,
      public: false,
      current: false,
      image: meditationData.media?.url,
      idToFetch: meditationData.id,
      entityType: 'MeditationDay',
      entityId: meditationData.id,
      type: 'page',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as RouteEntity));

    routes.push(...dayRoutes);
    return routes;
  }


  async findById(id: string): Promise<RouteEntity | null> {
    return this.routeRepo.findOne({ where: { id } });
  }

  async findRouteByEntityId(entityId: string): Promise<RouteEntity | null> {
    return this.routeRepo.findOne({ where: { entityId } });
  }

  async removeRoute(id: string): Promise<void> {
    const route = await this.routeRepo.findOne({ where: { id } });
    if (!route) {
      return;
    }

    await this.routeRepo.remove(route);
  }

  async removeRouteByEntity(entityType: string, entityId: string): Promise<void> {
    const route = await this.routeRepo.findOne({ where: { entityType, entityId } });
    if (!route) {
      return;
    }

    await this.routeRepo.remove(route);
  }

  async createRouteWithManager(
    manager: EntityManager,
    data: {
      title: string;
      public?: boolean;
      subtitle: string;
      idToFetch: string;
      path: string;
      entityType: string;
      description: string;
      entityId: string;
      type: RouteType;
      image?: string;
      current?: boolean
    },
  ): Promise<RouteEntity> {
    const route = manager.create(RouteEntity, {
      ...data,
      public: data.public ?? true,
      image: data.image || '',
    });

    return await manager.save(route);
  }

  async upsertRoute(routeId: string, updateData: Partial<RouteEntity>): Promise<RouteEntity> {
    const existingRoute = await this.routeRepo.findById(routeId);
    
    let prefix = '';
    if (updateData.path && updateData.path.endsWith('_')) {
      prefix = updateData.path;
    } else if (existingRoute?.path) {
      const parts = existingRoute.path.split('_');
      if (parts.length > 1) {
        prefix = parts.slice(0, -1).join('_') + '_';
      }
    } else if (updateData.path) {
      prefix = updateData.path;
    }
    
    if (updateData.title) {
      const titleChanged = !existingRoute || existingRoute.title !== updateData.title;
      const hasPrefix = updateData.path && updateData.path.endsWith('_');
      
      if (titleChanged || !existingRoute || hasPrefix) {
        const generatedPath = this.generateRoute(updateData.title, prefix);
        
        const existingPathRoute = await this.routeRepo.findByPath(generatedPath);
        if (existingPathRoute && existingPathRoute.id !== routeId) {
          const availablePath = await this.generateAvailablePath(updateData.title, prefix);
          updateData.path = availablePath;
        } else {
          updateData.path = generatedPath;
        }
      } else {
        updateData.path = existingRoute.path;
      }
    } else if (updateData.path && !updateData.path.endsWith('_')) {
      const existingPathRoute = await this.routeRepo.findByPath(updateData.path);
      if (existingPathRoute && existingPathRoute.id !== routeId) {
        const pathParts = updateData.path.split('_');
        const baseTitle = pathParts[pathParts.length - 1] || 'route';
        const pathPrefix = pathParts.slice(0, -1).join('_') + '_';
        const availablePath = await this.generateAvailablePath(baseTitle, pathPrefix);
        updateData.path = availablePath;
      }
    } else if (existingRoute) {
      updateData.path = existingRoute.path;
    } else if (updateData.path && updateData.path.endsWith('_')) {
      this.logger.warn(`Attempting upsert with only prefix "${updateData.path}" without title`);
    }

    if (!updateData.path || updateData.path.endsWith('_')) {
      if (updateData.title && prefix) {
        const generatedPath = this.generateRoute(updateData.title, prefix);
        const existingPathRoute = await this.routeRepo.findByPath(generatedPath);
        if (existingPathRoute && existingPathRoute.id !== routeId) {
          updateData.path = await this.generateAvailablePath(updateData.title, prefix);
        } else {
          updateData.path = generatedPath;
        }
      } else if (existingRoute) {
        updateData.path = existingRoute.path;
      } else {
        throw new BadRequestException('Could not generate a valid path for the route. Title is required.');
      }
    }

    return this.routeRepo.upsertRoute(routeId, updateData);
  }
}
