import { HttpException, Injectable, Logger } from "@nestjs/common";
import {
  ProcessException,
  ResourceNotFoundException,
  RuleException,
} from "src/common/exceptions";
import { RouteService } from "src/infrastructure/route/services/route.service";
import {
  RouteEntity,
  RouteType,
} from "src/infrastructure/route/route-page.entity";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { VisitMaterialsPageRepository } from "../repositories/visit-material-page.repository";
import { UpdateVisitMaterialsPageDto } from "../dto/update-visit-material-page.dto";
import { VisitMaterialsPageResponseDTO } from "../dto/visit-material-page-response.dto";
import { toVisitMaterialsPageResponseDto } from "../mappers/visit-material-page.mapper";
import { toMediaBuckets } from "../utils/visit-material-payload.util";
import { UploadedFilesDict, VisitMaterialWriteUnit } from "../types";
import { GetVisitMaterialPageService } from "./get-visit-material-page.service";
import { VisitMaterialMediaService } from "./visit-material-media.service";
import { VisitMaterialSectionsService } from "./visit-material-sections.service";
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
    private readonly sectionsService: VisitMaterialSectionsService,
    private readonly routeService: RouteService,
    private readonly mediaStorage: MediaStorageService,
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
    // `sections` omitido = não mexe nas seções (clientes antigos); enviado = lista completa.
    const preparedSections = dto.sections
      ? this.sectionsService.prepare(dto.sections, files)
      : null;

    // Ordem segura para o bucket e para o banco: arquivos novos sobem → tudo é gravado numa transação só →
    // só depois do commit saem os arquivos antigos. Se algo falha, o banco volta e os novos são descartados.
    const batch = this.mediaStorage.newBatch();
    const obsoleteUrls: string[] = [];

    try {
      const updatedPage = await this.repository.runInTransaction(
        async (manager) => {
          const unit: VisitMaterialWriteUnit = { manager, batch, obsoleteUrls };

          // Enfileira edições simultâneas da mesma página (ver `lockPage`).
          if (!(await this.repository.lockPage(manager, id))) {
            throw new ResourceNotFoundException(
              VISIT_MATERIAL_MESSAGES.PAGE_NOT_FOUND,
              { id },
            );
          }

          page.title = dto.pageTitle;
          page.subtitle = dto.pageSubtitle;
          page.description = dto.pageDescription;
          page.currentWeek = dto.currentWeek;
          if (dto.testament !== undefined) page.testament = dto.testament;
          // A página é gravada primeiro: um valor que o banco recusa (ex.: título longo) falha antes de
          // qualquer mídia ou rota mudar.
          await this.repository.save(page, manager);

          await this.syncMedia(unit, page.id, dto, files);
          if (preparedSections) {
            await this.sectionsService.sync(
              page.id,
              preparedSections,
              files,
              unit,
            );
          }

          page.route = await this.upsertRoute(route, dto, page.id);
          return this.repository.save(page, manager);
        },
      );

      batch.commit();
      await this.mediaStorage.deleteAfterCommit(obsoleteUrls);

      this.logger.log(`Visit material page updated: ${id}`);
      return toVisitMaterialsPageResponseDto(
        updatedPage,
        await this.mediaService.findAllByPage(updatedPage.id),
        await this.sectionsService.loadForPage(updatedPage.id),
      );
    } catch (error) {
      await batch.discard();
      // Preserva o código específico de qualquer exceção HTTP já classificada,
      // venha do módulo ou de um colaborador compartilhado.
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error updating visit material page ${id}`, error);
      throw new ProcessException(VISIT_MATERIAL_MESSAGES.UPDATE_FAILED, { id });
    }
  }

  /** The four media buckets of the page, reconciled inside the edit's transaction. */
  private syncMedia(
    unit: VisitMaterialWriteUnit,
    pageId: string,
    dto: UpdateVisitMaterialsPageDto,
    files: UploadedFilesDict,
  ): Promise<void> {
    return this.mediaService.reconcile(
      unit,
      pageId,
      toMediaBuckets(dto),
      files,
    );
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
      // Editar o texto da página não pode apagar a capa que o Estúdio gerou.
      image: route.image || VISIT_MATERIAL_ROUTE_CARD_IMAGE_URL,
    });
  }
}
