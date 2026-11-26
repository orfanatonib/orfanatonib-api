import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { VideosPageRepository } from "../repositories/video-page.repository";
import { VideoPageMessages } from "../constants";
import { errorReason, localFileUrls } from "../utils";

@Injectable()
export class DeleteVideosPageService {
  private readonly logger = new Logger(DeleteVideosPageService.name);

  constructor(
    private readonly videosPageRepo: VideosPageRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  async execute(id: string): Promise<void> {
    const page = await this.videosPageRepo.findById(id);
    if (!page)
      throw new NotFoundException(`Página com id ${id} não encontrada`);

    try {
      const mediaItems = await this.mediaItemProcessor.findMediaItemsByTarget(
        page.id,
        MediaTargetType.VideosPage,
      );

      // Banco primeiro, numa transação; os objetos só saem do bucket depois do commit.
      await this.videosPageRepo.runInTransaction(async (manager) => {
        await this.videosPageRepo.removeMedia(manager, mediaItems);
        await this.videosPageRepo.removePageWithRoute(manager, page);
      });
      await this.mediaStorage.deleteAfterCommit(localFileUrls(mediaItems));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error removing videos page ${id}. Rollback executed: ${errorReason(error)}`,
      );
      throw new BadRequestException(VideoPageMessages.DELETE_FAILED);
    }
  }
}
