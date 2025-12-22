import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MediaItemEntity } from './media-item/media-item.entity';

@Injectable()
export class MediaItemRepository {
  private readonly logger = new Logger(MediaItemRepository.name);

  constructor(
    @InjectRepository(MediaItemEntity)
    private readonly mediaRepo: Repository<MediaItemEntity>,
  ) { }

  async findByTarget(targetId: string, targetType: string): Promise<MediaItemEntity[]> {
    return this.mediaRepo.find({ where: { targetId, targetType } });
  }

  async findManyByTargets(targetIds: string[], targetType: string): Promise<MediaItemEntity[]> {
    return this.mediaRepo.find({
      where: {
        targetType,
        targetId: In(targetIds),
      },
    });
  }

  async save(media: MediaItemEntity): Promise<MediaItemEntity> {
    return this.mediaRepo.save(media);
  }

  async saveById(id: string, data: Partial<MediaItemEntity>): Promise<MediaItemEntity> {
    await this.mediaRepo.upsert(
      { ...data, id },
      ['id'],
    );
    const updated = await this.mediaRepo.findOneBy({ id });
    return updated!;
  }

  async update(id: string, partial: Partial<MediaItemEntity>): Promise<void> {
    await this.mediaRepo.update(id, partial);
  }

  async removeMany(items: MediaItemEntity[]): Promise<void> {
    await this.mediaRepo.remove(items);
  }

  async removeOne(item: MediaItemEntity): Promise<void> {
    await this.mediaRepo.remove(item);
  }
}
