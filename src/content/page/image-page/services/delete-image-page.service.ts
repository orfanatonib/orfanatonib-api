import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { FEED_PAGE_ID_ENV } from "../constants";
import { ImagePageRepository } from "../repositories/image-page.repository";
import { ImagePageTransactionRepository } from "../repositories/image-page-transaction.repository";

@Injectable()
export class DeleteImagePageService {
  private readonly logger = new Logger(DeleteImagePageService.name);

  constructor(
    private readonly transactions: ImagePageTransactionRepository,
    private readonly imagePageRepository: ImagePageRepository,
    private readonly routeService: RouteService,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
    private readonly configService: ConfigService,
  ) {}

  async removePage(id: string): Promise<void> {
    const protectedPageId = this.configService.get<string>(FEED_PAGE_ID_ENV);
    if (protectedPageId && id === protectedPageId) {
      this.logger.warn(`Attempt to delete protected page: ID=${id}`);
      throw new ForbiddenException(
        "This page cannot be deleted as it is the orphanage feed page.",
      );
    }

    let media: MediaItemEntity[];
    try {
      media = await this.transactions.run(async (tx) => {
        const page = await this.imagePageRepository.findByIdWithSections(id);
        if (!page) {
          throw new NotFoundException(`Página com id ${id} não encontrada`);
        }
        const sectionIds = page.sections?.map((s) => s.id) ?? [];
        const pageMedia =
          sectionIds.length > 0
            ? await this.mediaItemProcessor.findManyMediaItemsByTargets(
                sectionIds,
                MediaTargetType.ImagesPage,
              )
            : [];
        if (page.route?.id) {
          await this.routeService.removeRoute(page.route.id);
        }
        await tx.removePage(page);
        return pageMedia;
      });
    } catch (error) {
      this.logger.error("Error removing gallery. Rolling back.", error);
      // Id inexistente é 404 (padrão do vídeo/ideias); o resto segue 400.
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException("Erro ao remover a galeria.");
    }

    await this.removeMedia(media);
  }

  /** Depois do commit: linhas primeiro, objetos por último (falha vai para a fila de limpeza). */
  private async removeMedia(media: MediaItemEntity[]): Promise<void> {
    try {
      const urls =
        await this.mediaItemProcessor.removeMediaItemsKeepingFiles(media);
      await this.mediaStorage.deleteAfterCommit(urls);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Mídia da galeria removida sem limpeza completa: ${reason}`,
      );
    }
  }
}
