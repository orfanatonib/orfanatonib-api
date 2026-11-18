import { Injectable, Logger } from "@nestjs/common";

import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MEDIA_CLEANUP_MAX_ATTEMPTS } from "./media-storage.constants";
import { MediaCleanupQueueRepository } from "./media-cleanup-queue.repository";

@Injectable()
export class MediaCleanupService {
  private readonly logger = new Logger(MediaCleanupService.name);

  constructor(
    private readonly s3: AwsS3Service,
    private readonly queue: MediaCleanupQueueRepository,
  ) {}

  /** Reprocessa a fila; retorna quantos objetos foram removidos e quantos excederam as tentativas. */
  async processQueue(
    batchSize = 100,
  ): Promise<{ removed: number; failed: number }> {
    let removed = 0;
    let failed = 0;
    for (const item of await this.queue.findPending(batchSize)) {
      try {
        await this.s3.deleteKey(item.storageKey);
        await this.queue.remove(item);
        removed++;
      } catch (err: unknown) {
        item.attempts += 1;
        item.lastError = err instanceof Error ? err.message : String(err);
        if (item.attempts >= MEDIA_CLEANUP_MAX_ATTEMPTS) {
          item.failedAt = new Date();
          failed++;
          this.logger.error(
            `Limpeza de ${item.storageKey} excedeu ${MEDIA_CLEANUP_MAX_ATTEMPTS} tentativas`,
          );
        }
        await this.queue.save(item);
      }
    }
    return { removed, failed };
  }
}
