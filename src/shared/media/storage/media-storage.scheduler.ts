import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { MediaCleanupService } from "./media-cleanup.service";
import { MediaReconciliationService } from "./media-reconciliation.service";

@Injectable()
export class MediaStorageScheduler {
  private readonly logger = new Logger(MediaStorageScheduler.name);

  constructor(
    private readonly cleanup: MediaCleanupService,
    private readonly reconciliation: MediaReconciliationService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES, { name: "media-cleanup-queue" })
  async processCleanupQueue(): Promise<void> {
    try {
      const { removed, failed } = await this.cleanup.processQueue();
      if (removed || failed) {
        this.logger.log(
          `media_cleanup_queue: removed=${removed} failed=${failed}`,
        );
      }
    } catch (err: unknown) {
      this.logger.error(
        `media_cleanup_queue falhou: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Só relata (dry-run): a remoção de órfãos é uma decisão explícita, nunca automática. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: "media-reconciliation-report",
  })
  async reportReconciliation(): Promise<void> {
    try {
      const r = await this.reconciliation.reconcile({ dryRun: true });
      if (r.orphanKeys.length || r.brokenReferences.length) {
        this.logger.warn(
          `reconciliação: órfãos=${r.orphanKeys.length} referências quebradas=${r.brokenReferences.length}`,
        );
      }
    } catch (err: unknown) {
      this.logger.error(
        `reconciliação falhou: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
