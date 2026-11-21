import { Injectable } from "@nestjs/common";
import { DataSource, EntityManager, Repository } from "typeorm";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { VideosPage } from "../entities/video-page.entity";

@Injectable()
export class VideosPageRepository extends Repository<VideosPage> {
  constructor(private readonly dataSource: DataSource) {
    super(VideosPage, dataSource.createEntityManager());
  }

  async findById(id: string): Promise<VideosPage | null> {
    return this.findOne({
      where: { id },
      relations: ["route"],
    });
  }

  async findAll(): Promise<VideosPage[]> {
    return this.find({
      relations: ["route"],
      order: { id: "ASC" },
    });
  }

  async upsertPage(data: Partial<VideosPage>): Promise<VideosPage> {
    if (data.id) {
      const existing = await this.preload(data);
      if (!existing) {
        throw new Error(
          `Página de vídeos com id=${data.id} não encontrada para atualização`,
        );
      }
      return this.save(existing);
    }

    const created = this.create(data);
    return this.save(created);
  }

  async removePage(page: VideosPage): Promise<VideosPage> {
    return this.remove(page);
  }

  /** Executa `work` numa única transação; o rollback é automático se ele lançar. */
  runInTransaction<TResult>(
    work: (manager: EntityManager) => Promise<TResult>,
  ): Promise<TResult> {
    return this.dataSource.transaction(work);
  }

  /** Trava a página até o fim da transação: edições simultâneas da mesma página se enfileiram. */
  async lockPage(manager: EntityManager, id: string): Promise<boolean> {
    const locked = await manager
      .createQueryBuilder(VideosPage, "page")
      .setLock("pessimistic_write")
      .where("page.id = :id", { id })
      .getOne();
    return locked !== null;
  }

  findMedia(
    manager: EntityManager,
    pageId: string,
  ): Promise<MediaItemEntity[]> {
    return manager.find(MediaItemEntity, {
      where: { targetId: pageId, targetType: MediaTargetType.VideosPage },
      order: { createdAt: "ASC", id: "ASC" },
    });
  }

  createPage(
    manager: EntityManager,
    data: Pick<VideosPage, "name" | "description" | "public">,
  ): Promise<VideosPage> {
    return manager.save(manager.create(VideosPage, data));
  }

  savePage(manager: EntityManager, page: VideosPage): Promise<VideosPage> {
    return manager.save(page);
  }

  saveMedia(
    manager: EntityManager,
    media: MediaItemEntity,
  ): Promise<MediaItemEntity> {
    return manager.save(MediaItemEntity, media);
  }

  async removeMedia(
    manager: EntityManager,
    items: MediaItemEntity[],
  ): Promise<void> {
    if (items.length === 0) return;
    await manager.remove(MediaItemEntity, items);
  }

  async removePageWithRoute(
    manager: EntityManager,
    page: VideosPage,
  ): Promise<void> {
    const route = page.route;
    await manager.remove(page);
    if (route?.id) await manager.remove(route);
  }
}
