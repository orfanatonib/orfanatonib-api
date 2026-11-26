import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { IntegrationRepository } from "../integration.repository";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";

@Injectable()
export class DeleteIntegrationService {
  private readonly logger = new Logger(DeleteIntegrationService.name);

  constructor(
    private readonly repository: IntegrationRepository,
    private readonly mediaProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  async execute(id: string): Promise<void> {
    const integration = await this.repository.findById(id);
    if (!integration) {
      throw new NotFoundException(`Integration with ID ${id} not found`);
    }

    try {
      const mediaItems = await this.mediaProcessor.findMediaItemsByTarget(
        id,
        MediaTargetType.Integration,
      );

      // Integração e linhas primeiro; objetos do bucket só depois (falha vai para a fila).
      await this.repository.remove(id);
      const fileUrls =
        await this.mediaProcessor.removeMediaItemsKeepingFiles(mediaItems);
      await this.mediaStorage.deleteAfterCommit(fileUrls);
      this.logger.log(
        `Deleted ${mediaItems.length} media items for integration ${id}`,
      );
      this.logger.log(`Integration ${id} deleted successfully`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error deleting integration ${id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException("Error deleting integration");
    }
  }
}
