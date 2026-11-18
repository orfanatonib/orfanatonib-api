import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MediaItemEntity } from "./media-item/media-item.entity";
import { MediaItemProcessor } from "./media-item-processor";
import { MediaItemRepository } from "./media-item-repository";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { MediaReferenceRepository } from "./storage/media-reference.repository";
import { UploadScopeInterceptor } from "./storage/upload-scope.interceptor";
import { MediaCleanupQueueEntity } from "./storage/media-cleanup-queue.entity";
import { MediaCleanupQueueRepository } from "./storage/media-cleanup-queue.repository";
import { MediaCleanupService } from "./storage/media-cleanup.service";
import { MediaReconciliationService } from "./storage/media-reconciliation.service";
import { MediaReconciliationController } from "./storage/media-reconciliation.controller";
import { MediaStorageScheduler } from "./storage/media-storage.scheduler";
import { MediaStorageService } from "./storage/media-storage.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaItemEntity, MediaCleanupQueueEntity]),
  ],
  controllers: [MediaReconciliationController],
  providers: [
    MediaReferenceRepository,
    UploadScopeInterceptor,
    { provide: APP_INTERCEPTOR, useExisting: UploadScopeInterceptor },
    MediaItemProcessor,
    MediaItemRepository,
    MediaCleanupQueueRepository,
    MediaStorageService,
    MediaCleanupService,
    MediaReconciliationService,
    MediaStorageScheduler,
  ],
  exports: [
    MediaItemProcessor,
    MediaStorageService,
    MediaReconciliationService,
  ],
})
export class MediaModule {}
