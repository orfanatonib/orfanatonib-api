import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { IdeasPageRepository } from "../repositories/ideas-page.repository";
import { IdeasPageWriteRepository } from "../repositories/ideas-page-write.repository";

@Injectable()
export class DeleteIdeasPageService {
  private readonly logger = new Logger(DeleteIdeasPageService.name);

  constructor(
    private readonly pageRepo: IdeasPageRepository,
    private readonly writeRepo: IdeasPageWriteRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  /**
   * Linhas (página, rota, seções, mídias) saem numa transação; os objetos do
   * bucket só são apagados DEPOIS do commit (falha vai para a fila de limpeza),
   * então um rollback nunca deixa referência quebrada.
   */
  async removeIdeasPage(id: string): Promise<void> {
    const page = await this.pageRepo.findOnePageById(id);
    if (!page) {
      throw new NotFoundException(`Ideas page with id ${id} not found`);
    }

    const sectionIds = (page.sections ?? []).map((s) => s.id);
    const media =
      sectionIds.length > 0
        ? await this.mediaItemProcessor.findManyMediaItemsByTargets(
            sectionIds,
            MediaTargetType.IdeasSection,
          )
        : [];

    try {
      await this.writeRepo.transaction(async (tx) => {
        await tx.removeMedia(media);
        const clean = await tx.removePageWithRoute(page, sectionIds);
        if (!clean) {
          throw new BadRequestException(
            "Failed to remove all associated sections",
          );
        }
      });
    } catch (error: unknown) {
      this.logger.error(
        "Error removing ideas page. Rolled back.",
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException("Error removing ideas page.");
    }

    await this.mediaStorage.deleteAfterCommit(
      media.filter((m) => m.isLocalFile && m.url).map((m) => m.url),
    );
  }
}
