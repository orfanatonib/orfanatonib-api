import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { MediaItemEntity } from "./media-item/media-item.entity";

@Injectable()
export class MediaItemRepository {
  private readonly logger = new Logger(MediaItemRepository.name);

  constructor(
    @InjectRepository(MediaItemEntity)
    private readonly mediaRepo: Repository<MediaItemEntity>,
  ) {}

  async findByTarget(
    targetId: string,
    targetType: string,
  ): Promise<MediaItemEntity[]> {
    return this.mediaRepo.find({ where: { targetId, targetType } });
  }

  async findManyByTargets(
    targetIds: string[],
    targetType: string,
  ): Promise<MediaItemEntity[]> {
    return this.mediaRepo.find({
      where: {
        targetType,
        targetId: In(targetIds),
      },
    });
  }

  async findById(id: string): Promise<MediaItemEntity | null> {
    return this.mediaRepo.findOneBy({ id });
  }

  async save(media: MediaItemEntity): Promise<MediaItemEntity> {
    return this.mediaRepo.save(media);
  }

  async saveById(
    id: string,
    data: Partial<MediaItemEntity>,
  ): Promise<MediaItemEntity> {
    await this.mediaRepo.upsert({ ...data, id }, ["id"]);
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

  /** Dentre as URLs informadas, as que alguma mídia ainda referencia (pela URL ou pela chave). */
  async findReferencedUrls(urls: readonly string[]): Promise<Set<string>> {
    if (urls.length === 0) return new Set();
    const rows = await this.mediaRepo.find({
      where: { url: In([...urls]) },
      select: { id: true, url: true },
    });
    return new Set(rows.map((row) => row.url));
  }

  /** URLs de todos os arquivos locais (S3) referenciados — base da reconciliação. */
  async findLocalFileUrls(): Promise<string[]> {
    const rows = await this.mediaRepo.find({
      where: { isLocalFile: true },
      select: { id: true, url: true, storageKey: true },
    });
    return rows.map((r) => r.storageKey ?? r.url);
  }
}
