import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { RouteService } from "src/infrastructure/route/services/route.service";
import {
  RouteEntity,
  RouteType,
} from "src/infrastructure/route/route-page.entity";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import {
  IDEAS_PAGE_ROUTE_IMAGE,
  IDEAS_PAGE_ROUTE_PREFIX,
} from "../constants/ideas-page.constants";
import { UpdateIdeasPageDto } from "../dto/update-ideas-page.dto";
import { IdeasPageResponseDto } from "../dto/ideas-page-response.dto";
import {
  IdeasPageTransaction,
  IdeasPageWriteRepository,
} from "../repositories/ideas-page-write.repository";
import { IdeasPageMediaSyncService } from "./ideas-page-media-sync.service";

interface UpdateOutcome {
  response: IdeasPageResponseDto;
  obsoleteUrls: string[];
}

@Injectable()
export class UpdateIdeasPageService {
  private readonly logger = new Logger(UpdateIdeasPageService.name);

  constructor(
    private readonly writeRepo: IdeasPageWriteRepository,
    private readonly routeService: RouteService,
    private readonly mediaSync: IdeasPageMediaSyncService,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  async updateIdeasPage(
    id: string,
    pageData: UpdateIdeasPageDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<IdeasPageResponseDto> {
    const batch = this.mediaStorage.newBatch();
    try {
      const outcome = await this.writeRepo.transaction((tx) =>
        this.apply(tx, id, pageData, filesDict, batch),
      );
      batch.commit();
      await this.mediaStorage.deleteAfterCommit(outcome.obsoleteUrls);
      return outcome.response;
    } catch (error: unknown) {
      await batch.discard();
      this.logger.error(
        `Error updating ideas page with ID: ${id}. Rolled back`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof HttpException && !this.isInternal(error)) {
        throw error;
      }
      throw new BadRequestException(
        "Error updating ideas page. No data was saved.",
      );
    }
  }

  private isInternal(error: HttpException): boolean {
    return error.getStatus() >= 500;
  }

  private async apply(
    tx: IdeasPageTransaction,
    id: string,
    pageData: UpdateIdeasPageDto,
    filesDict: Record<string, Express.Multer.File>,
    batch: ReturnType<MediaStorageService["newBatch"]>,
  ): Promise<UpdateOutcome> {
    const page = await tx.lockPage(id);
    if (!page) throw new NotFoundException("Ideas page not found");
    const route = await this.routeService.findRouteByEntityId(page.id);
    if (!route) throw new NotFoundException("Ideas page route not found");

    const existingSections = await tx.findSections(page.id);
    const oldMedia = await tx.findMediaOfSections(
      existingSections.map((s) => s.id),
    );

    const requested = pageData.sections;
    await tx.removeSections(
      existingSections.filter((s) => !requested.some((r) => r.id === s.id)),
    );
    const obsoleteUrls = await this.removeUnrequestedMedia(
      tx,
      oldMedia,
      requested.flatMap((s) => (s.medias ?? []).map((m) => m.id)),
    );

    const savedPage = await tx.savePage({
      id: page.id,
      title: pageData.title,
      subtitle: pageData.subtitle,
      description: pageData.description,
      public: false, // sempre privada: edição também normaliza legado
    });

    const mediaBySection = new Map<string, MediaItemEntity[]>();
    for (const input of requested) {
      const known = existingSections.find((s) => s.id === input.id);
      const fields = {
        title: input.title,
        description: input.description,
        public: input.public ?? true,
      };
      const section = known
        ? await tx.saveSection({ id: known.id, ...fields, page: savedPage })
        : await tx.createSection(savedPage, fields);
      const synced = await this.mediaSync.syncSection(
        tx,
        section.id,
        input.medias ?? [],
        oldMedia,
        filesDict,
        batch,
      );
      mediaBySection.set(section.id, synced.saved);
      obsoleteUrls.push(...synced.obsoleteUrls);
    }

    await this.upsertRoute(route, pageData, page.id);
    const reloaded = await tx.loadPage(page.id);
    if (!reloaded) throw new NotFoundException("Ideas page not found");
    return {
      response: IdeasPageResponseDto.fromEntity(reloaded, mediaBySection),
      obsoleteUrls,
    };
  }

  /** Remove as linhas de mídia fora da lista pedida; devolve os arquivos a apagar após o commit. */
  private async removeUnrequestedMedia(
    tx: IdeasPageTransaction,
    oldMedia: MediaItemEntity[],
    requestedIds: Array<string | undefined>,
  ): Promise<string[]> {
    const keep = new Set(requestedIds.filter((v): v is string => !!v));
    const toRemove = oldMedia.filter((m) => !keep.has(m.id));
    await tx.removeMedia(toRemove);
    return toRemove.filter((m) => m.isLocalFile && m.url).map((m) => m.url);
  }

  private async upsertRoute(
    route: RouteEntity,
    pageData: UpdateIdeasPageDto,
    pageId: string,
  ): Promise<RouteEntity> {
    return this.routeService.upsertRoute(route.id, {
      title: pageData.title,
      subtitle: pageData.subtitle,
      description: pageData.description,
      idToFetch: pageId,
      entityType: MediaTargetType.IdeasPage,
      entityId: pageId,
      type: RouteType.PAGE,
      path: IDEAS_PAGE_ROUTE_PREFIX,
      image: IDEAS_PAGE_ROUTE_IMAGE,
      public: false,
    });
  }
}
