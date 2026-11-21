import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { plainToInstance } from "class-transformer";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { RouteType } from "src/infrastructure/route/route-page.entity";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { UploadType } from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import {
  MediaStorageService,
  UploadRequest,
} from "src/shared/media/storage/media-storage.service";
import type { UploadBatch } from "src/shared/media/storage/upload-batch";
import {
  IDEAS_PAGE_ROUTE_IMAGE,
  IDEAS_PAGE_ROUTE_PREFIX,
} from "../constants/ideas-page.constants";
import { CreateIdeasPageDto } from "../dto/create-ideas-page.dto";
import { IdeasPageResponseDto } from "../dto/ideas-page-response.dto";
import { IdeasPageEntity } from "../entities/ideas-page.entity";
import { IdeasPageWriteRepository } from "../repositories/ideas-page-write.repository";
import { normalizeMediaType } from "../utils/ideas-page-media.utils";

interface UploadedSlot {
  url: string;
  key: string;
  originalName: string;
  size: number;
}

@Injectable()
export class CreateIdeasPageService {
  private readonly logger = new Logger(CreateIdeasPageService.name);

  constructor(
    private readonly writeRepo: IdeasPageWriteRepository,
    private readonly routeService: RouteService,
    private readonly mediaProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  async createIdeasPage(
    dto: CreateIdeasPageDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<IdeasPageResponseDto> {
    const batch = this.mediaStorage.newBatch();
    try {
      const uploaded = await this.uploadFiles(dto, filesDict, batch);
      const page = await this.persist(dto, uploaded);
      batch.commit();
      return plainToInstance(IdeasPageResponseDto, page);
    } catch (err: unknown) {
      await batch.discard();
      this.logger.error(
        "Criação da página de ideias desfeita",
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  /** Valida e envia todos os arquivos antes de tocar no banco; falha descarta o que subiu. */
  private async uploadFiles(
    dto: CreateIdeasPageDto,
    filesDict: Record<string, Express.Multer.File>,
    batch: UploadBatch,
  ): Promise<Map<string, UploadedSlot>> {
    const ownerId = randomUUID();
    const requests: UploadRequest[] = [];
    const slots: string[] = [];
    dto.sections.forEach((section, sIdx) =>
      (section.medias ?? []).forEach((item, mIdx) => {
        if (item.uploadType !== UploadType.UPLOAD) return;
        const file = item.fieldKey ? filesDict[item.fieldKey] : undefined;
        if (!file) {
          throw new BadRequestException(`File missing for "${item.title}"`);
        }
        requests.push({
          file,
          mediaType: normalizeMediaType(item.mediaType),
          entity: MediaTargetType.IdeasSection,
          ownerId,
        });
        slots.push(`${sIdx}:${mIdx}`);
      }),
    );
    await this.mediaStorage.uploadAll(requests, batch);
    return new Map(
      slots.map((slot, i) => {
        const { url, key } = batch.objects[i];
        const { originalname, size } = requests[i].file;
        return [slot, { url, key, originalName: originalname, size }] as const;
      }),
    );
  }

  private persist(
    dto: CreateIdeasPageDto,
    uploaded: Map<string, UploadedSlot>,
  ): Promise<IdeasPageEntity> {
    return this.writeRepo.transaction(async (tx) => {
      const saved = await tx.createPage(dto);
      for (const [sIdx, secDto] of dto.sections.entries()) {
        const section = await tx.createSection(saved, secDto);
        for (const [mIdx, item] of (secDto.medias ?? []).entries()) {
          const upload = uploaded.get(`${sIdx}:${mIdx}`);
          const media = this.mediaProcessor.buildBaseMediaItem(
            {
              ...item,
              mediaType: normalizeMediaType(item.mediaType),
              url: upload ? upload.url : item.url?.trim(),
              isLocalFile: !!upload,
              originalName: upload?.originalName ?? item.originalName,
              size: upload?.size ?? item.size,
            },
            section.id,
            MediaTargetType.IdeasSection,
          );
          media.storageKey = upload?.key;
          await tx.saveMedia(media);
        }
      }

      const path = await this.routeService.generateAvailablePath(
        dto.title,
        IDEAS_PAGE_ROUTE_PREFIX,
      );
      const route = await this.routeService.createRouteWithManager(tx.manager, {
        title: dto.title,
        subtitle: dto.subtitle || "",
        description: dto.description,
        path,
        type: RouteType.PAGE,
        entityId: saved.id,
        idToFetch: saved.id,
        entityType: MediaTargetType.IdeasPage,
        image: IDEAS_PAGE_ROUTE_IMAGE,
        public: false,
      });
      await tx.attachRoute(saved, route);
      const reloaded = await tx.loadPage(saved.id);
      if (!reloaded) throw new BadRequestException("Página não encontrada");
      return reloaded;
    });
  }
}
