import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, Repository } from "typeorm";
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
      // Ordem de envio, sempre a mesma (sem ORDER BY o MySQL devolvia pela chave e o vídeo podia vir antes das fotos).
      order: { createdAt: "ASC", id: "ASC" },
    });
  }

  async findById(id: string): Promise<MediaItemEntity | null> {
    return this.mediaRepo.findOneBy({ id });
  }

  /** Dentro de uma transação, o repositório do `manager`; fora dela, o padrão. */
  private repoFor(manager?: EntityManager): Repository<MediaItemEntity> {
    return manager ? manager.getRepository(MediaItemEntity) : this.mediaRepo;
  }

  async save(
    media: MediaItemEntity,
    manager?: EntityManager,
  ): Promise<MediaItemEntity> {
    return this.repoFor(manager).save(media);
  }

  async saveById(
    id: string,
    data: Partial<MediaItemEntity>,
    manager?: EntityManager,
  ): Promise<MediaItemEntity> {
    const repo = this.repoFor(manager);
    await repo.upsert({ ...data, id }, ["id"]);
    const updated = await repo.findOneBy({ id });
    return updated!;
  }

  async update(id: string, partial: Partial<MediaItemEntity>): Promise<void> {
    await this.mediaRepo.update(id, partial);
  }

  async removeMany(
    items: MediaItemEntity[],
    manager?: EntityManager,
  ): Promise<void> {
    await this.repoFor(manager).remove(items);
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
