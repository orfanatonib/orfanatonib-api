import { Injectable } from "@nestjs/common";
import { DataSource, DeepPartial, EntityManager } from "typeorm";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { ImageSectionEntity } from "../../image-page/entities/image-section.entity";

/** Escritas de uma publicação dentro de UMA transação (mesmo `EntityManager` em todas). */
export class ImageSectionTransaction {
  constructor(readonly manager: EntityManager) {}

  /** Trava a publicação até o fim da transação: edições simultâneas se enfileiram. */
  async lockSection(id: string): Promise<ImageSectionEntity | null> {
    return this.manager
      .createQueryBuilder(ImageSectionEntity, "section")
      .setLock("pessimistic_write")
      .where("section.id = :id", { id })
      .getOne();
  }

  findSection(id: string): Promise<ImageSectionEntity | null> {
    return this.manager.findOne(ImageSectionEntity, {
      where: { id },
      relations: ["author"],
    });
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
export class ImageSectionTransactionRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Confirma se `work` resolver; desfaz tudo e propaga o erro se rejeitar. */
  run<T>(work: (tx: ImageSectionTransaction) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      work(new ImageSectionTransaction(manager)),
    );
  }
}
