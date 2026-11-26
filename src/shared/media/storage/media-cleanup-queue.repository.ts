import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";

import { MediaCleanupQueueEntity } from "./media-cleanup-queue.entity";

@Injectable()
export class MediaCleanupQueueRepository {
  constructor(
    @InjectRepository(MediaCleanupQueueEntity)
    private readonly repo: Repository<MediaCleanupQueueEntity>,
  ) {}

  async enqueue(storageKey: string, lastError: string | null): Promise<void> {
    const existing = await this.repo.findOneBy({ storageKey });
    if (existing) {
      existing.lastError = lastError;
      await this.repo.save(existing);
      return;
    }
    await this.repo.save(
      this.repo.create({ storageKey, attempts: 0, lastError }),
    );
  }

  findPending(limit: number): Promise<MediaCleanupQueueEntity[]> {
    return this.repo.find({
      where: { failedAt: IsNull() },
      take: limit,
      order: { createdAt: "ASC" },
    });
  }

  async remove(item: MediaCleanupQueueEntity): Promise<void> {
    await this.repo.remove(item);
  }

  async save(item: MediaCleanupQueueEntity): Promise<void> {
    await this.repo.save(item);
  }
}
