import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { ImageSectionTransactionRepository } from "../repositories/image-section-transaction.repository";

@Injectable()
export class DeleteImageSectionService {
  private readonly logger = new Logger(DeleteImageSectionService.name);

  constructor(
    private readonly transactions: ImageSectionTransactionRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  /** Linhas e publicação saem juntas; os objetos só depois do commit (falha vai para a fila). */
  async deleteSection(id: string): Promise<void> {
    let urls: string[];
    try {
      urls = await this.transactions.run(async (tx) => {
        const section = await tx.lockSection(id);
        if (!section) {
          throw new NotFoundException(`Seção com id=${id} não encontrada`);
        }
        const mediaItems: MediaItemEntity[] =
          await this.mediaItemProcessor.findMediaItemsByTarget(
            section.id,
            MediaTargetType.ImagesPage,
          );
        const removedUrls: string[] = [];
        for (const media of mediaItems) {
          if (media.isLocalFile && media.url) removedUrls.push(media.url);
          await tx.removeMedia(media);
        }
        await tx.removeSection(section);
        return removedUrls;
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error("Error removing section. Rollback executed.", error);
      throw new BadRequestException("Error removing section.");
    }

    await this.mediaStorage.deleteAfterCommit(urls);
  }
}
