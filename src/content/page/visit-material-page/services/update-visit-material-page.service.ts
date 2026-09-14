import { HttpException, Injectable, Logger } from "@nestjs/common";
import {
  ProcessException,
  ResourceNotFoundException,
  RuleException,
} from "src/common/exceptions";
import { RouteService } from "src/infrastructure/route/route.service";
import {
  RouteEntity,
  RouteType,
} from "src/infrastructure/route/route-page.entity";
import { MediaItemDto } from "src/shared/dto/media-item-dto";
import {
  MediaItemEntity,
  MediaType,
} from "src/shared/media/media-item/media-item.entity";
import { VisitMaterialsPageRepository } from "../repositories/visit-material-page.repository";
import { UpdateVisitMaterialsPageDto } from "../dto/update-visit-material-page.dto";
import { VisitMaterialsPageResponseDTO } from "../dto/visit-material-page-response.dto";
import { toVisitMaterialsPageResponseDto } from "../mappers/visit-material-page.mapper";
import { toMediaBuckets } from "../utils/visit-material-payload.util";
import { UploadedFilesDict } from "../types";
import { GetVisitMaterialPageService } from "./get-visit-material-page.service";
import { VisitMaterialMediaService } from "./visit-material-media.service";
import {
  VISIT_MATERIAL_MESSAGES,
  VISIT_MATERIAL_ROUTE_CARD_IMAGE_URL,
  VISIT_MATERIAL_ROUTE_ENTITY_TYPE,
  VISIT_MATERIAL_ROUTE_PATH_PREFIX,
} from "../constants";

@Injectable()
export class UpdateVisitMaterialPageService {
  private readonly logger = new Logger(UpdateVisitMaterialPageService.name);

  constructor(
    private readonly repository: VisitMaterialsPageRepository,
    private readonly getService: GetVisitMaterialPageService,
    private readonly mediaService: VisitMaterialMediaService,
    private readonly routeService: RouteService,
  ) {}

  async execute(
    id: string,
    dto: UpdateVisitMaterialsPageDto,
    files: UploadedFilesDict,
  ): Promise<VisitMaterialsPageResponseDTO> {
    if (dto.id !== id) {
      throw new RuleException(VISIT_MATERIAL_MESSAGES.ID_MISMATCH, {
        pathId: id,
        payloadId: dto.id,
      });
    }

    const page = await this.getService.findEntityOrFail(id);
    const route = await this.findRouteOrFail(page.id);

    try {
      await this.syncMedia(page.id, dto, files);

      const updatedRoute = await this.upsertRoute(route, dto, page.id);

      const updatedPage = await this.repository.runInTransaction(
        async (manager) => {
          page.title = dto.pageTitle;
          page.subtitle = dto.pageSubtitle;
          page.description = dto.pageDescription;
          page.currentWeek = dto.currentWeek;
          if (dto.testament !== undefined) page.testament = dto.testament;
          page.route = updatedRoute;

          return this.repository.save(page, manager);
        },
      );

      this.logger.log(`Visit material page updated: ${id}`);
      return toVisitMaterialsPageResponseDto(
        updatedPage,
        await this.mediaService.findAllByPage(updatedPage.id),
      );
    } catch (error) {
      // Preserva o código específico de qualquer exceção HTTP já classificada,
      // venha do módulo ou de um colaborador compartilhado.
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error updating visit material page ${id}`, error);
      throw new ProcessException(VISIT_MATERIAL_MESSAGES.UPDATE_FAILED, { id });
    }
  }

  /**
   * Reconciles the four media buckets against what is stored: whatever the
   * payload dropped is deleted, items with an id are updated and the rest are
   * created. One pass per bucket, one routine for all of them.
   */
  private async syncMedia(
    pageId: string,
    dto: UpdateVisitMaterialsPageDto,
    files: UploadedFilesDict,
  ): Promise<void> {
    const stored = await this.mediaService.findGroupedByPage(pageId);
    const buckets = VisitMaterialMediaService.toEntries(toMediaBuckets(dto));

    for (const [mediaType, incoming] of buckets) {
      await this.mediaService.removeMissing(
        stored.get(mediaType) ?? [],
        incoming,
      );
    }

    for (const [mediaType, incoming] of buckets) {
      for (const item of incoming) {
        await this.persistMediaItem(item, pageId, mediaType, files);
      }
    }
  }

  private persistMediaItem(
    item: MediaItemDto,
    pageId: string,
    mediaType: MediaType,
    files: UploadedFilesDict,
  ): Promise<MediaItemEntity> {
    return item.id
      ? this.mediaService.upsert(item, pageId, mediaType, files)
      : this.mediaService.add(item, pageId, mediaType, files);
  }

  private async findRouteOrFail(pageId: string): Promise<RouteEntity> {
    const route = await this.routeService.findRouteByEntityId(pageId);
    if (!route) {
      throw new ResourceNotFoundException(
        VISIT_MATERIAL_MESSAGES.ROUTE_NOT_FOUND,
        {
          pageId,
        },
      );
    }
    return route;
  }

  private upsertRoute(
    route: RouteEntity,
    dto: UpdateVisitMaterialsPageDto,
    pageId: string,
  ): Promise<RouteEntity> {
    return this.routeService.upsertRoute(route.id, {
      title: dto.pageTitle,
      subtitle: dto.pageSubtitle,
      description: dto.pageDescription,
      idToFetch: pageId,
      entityId: pageId,
      entityType: VISIT_MATERIAL_ROUTE_ENTITY_TYPE,
      public: route.public,
      current: route.current,
      type: RouteType.PAGE,
      path: VISIT_MATERIAL_ROUTE_PATH_PREFIX,
      image: VISIT_MATERIAL_ROUTE_CARD_IMAGE_URL,
    });
  }
}
