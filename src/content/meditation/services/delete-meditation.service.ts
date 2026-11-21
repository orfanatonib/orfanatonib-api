import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MeditationRepository } from "../meditation.repository";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";

@Injectable()
export class DeleteMeditationService {
  private readonly logger = new Logger(DeleteMeditationService.name);

  constructor(
    private readonly meditationRepo: MeditationRepository,
    private readonly mediaStorage: MediaStorageService,
    private readonly routeService: RouteService,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  async remove(id: string): Promise<void> {
    const meditation = await this.meditationRepo.findOneWithRelations(id);
    if (!meditation) {
      this.logger.warn(`Meditation not found: ID=${id}`);
      throw new NotFoundException("Meditation not found");
    }

    const media = await this.mediaItemProcessor.findMediaItemsByTarget(
      id,
      MediaTargetType.Meditation,
    );
    // Linhas primeiro; os objetos só saem do bucket depois que a meditação e a rota foram removidas.
    const staleUrls =
      await this.mediaItemProcessor.removeMediaItemsKeepingFiles(media);

    await this.routeService.removeRouteByEntity(MediaTargetType.Meditation, id);

    await this.meditationRepo.delete(id);
    await this.mediaStorage.deleteAfterCommit(staleUrls);
  }
}
