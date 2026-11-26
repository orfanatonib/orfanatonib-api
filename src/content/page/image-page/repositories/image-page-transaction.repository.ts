import { Injectable } from "@nestjs/common";
import { DataSource, DeepPartial, EntityManager } from "typeorm";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { ImagePageEntity } from "../entities/image-page.entity";
import { ImageSectionEntity } from "../entities/image-section.entity";

/** Escritas de uma galeria dentro de UMA transação (mesmo `EntityManager` em todas). */
export class ImagePageTransaction {
  constructor(readonly manager: EntityManager) {}

  /** Trava a galeria até o fim da transação: edições simultâneas da mesma galeria se enfileiram. */
  async lockPage(id: string): Promise<boolean> {
    const locked = await this.manager
      .createQueryBuilder(ImagePageEntity, "page")
      .setLock("pessimistic_write")
      .where("page.id = :id", { id })
      .getOne();
    return locked !== null;
  }

  savePage(data: DeepPartial<ImagePageEntity>): Promise<ImagePageEntity> {
    return this.manager.save(ImagePageEntity, data) as Promise<ImagePageEntity>;
  }

  removePage(page: ImagePageEntity): Promise<ImagePageEntity> {
    return this.manager.remove(page);
  }

  saveSection(
    data: DeepPartial<ImageSectionEntity>,
  ): Promise<ImageSectionEntity> {
    return this.manager.save(
      ImageSectionEntity,
      data,
    ) as Promise<ImageSectionEntity>;
  }

  removeSection(section: ImageSectionEntity): Promise<ImageSectionEntity> {
    return this.manager.remove(ImageSectionEntity, section);
  }

  findMedia(id: string): Promise<MediaItemEntity | null> {
    return this.manager.findOne(MediaItemEntity, { where: { id } });
  }

  saveMedia(data: DeepPartial<MediaItemEntity>): Promise<MediaItemEntity> {
    return this.manager.save(MediaItemEntity, data) as Promise<MediaItemEntity>;
  }

  removeMedia(media: MediaItemEntity): Promise<MediaItemEntity> {
    return this.manager.remove(MediaItemEntity, media);
  }
}

@Injectable()
export class ImagePageTransactionRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Confirma se `work` resolver; desfaz tudo e propaga o erro se rejeitar. */
  run<T>(work: (tx: ImagePageTransaction) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      work(new ImagePageTransaction(manager)),
    );
  }
}
