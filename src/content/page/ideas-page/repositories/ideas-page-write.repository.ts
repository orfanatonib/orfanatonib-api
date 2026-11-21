import { Injectable } from "@nestjs/common";
import { DataSource, EntityManager, In } from "typeorm";
import { RouteEntity } from "src/infrastructure/route/route-page.entity";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { IdeasPageEntity } from "../entities/ideas-page.entity";
import { IdeasSectionEntity } from "../../ideas-section/entities/ideas-section.entity";

/** Operações de escrita da página de ideias dentro de UMA transação (mesmo EntityManager). */
export class IdeasPageTransaction {
  constructor(readonly manager: EntityManager) {}

  /** Trava a linha da página: edições simultâneas da mesma página se enfileiram. */
  lockPage(id: string): Promise<IdeasPageEntity | null> {
    return this.manager.findOne(IdeasPageEntity, {
      where: { id },
      loadEagerRelations: false,
      lock: { mode: "pessimistic_write" },
    });
  }

  loadPage(id: string): Promise<IdeasPageEntity | null> {
    return this.manager.findOne(IdeasPageEntity, {
      where: { id },
      relations: ["sections", "route"],
    });
  }

  createPage(data: {
    title: string;
    subtitle?: string;
    description: string;
  }): Promise<IdeasPageEntity> {
    return this.manager.save(
      this.manager.create(IdeasPageEntity, {
        title: data.title,
        subtitle: data.subtitle,
        description: data.description,
        public: false,
      }),
    );
  }

  savePage(page: Partial<IdeasPageEntity>): Promise<IdeasPageEntity> {
    return this.manager.save(IdeasPageEntity, page);
  }

  attachRoute(page: IdeasPageEntity, route: RouteEntity): Promise<unknown> {
    page.route = route;
    return this.manager.save(page);
  }

  createSection(
    page: IdeasPageEntity,
    data: { title: string; description: string; public?: boolean },
  ): Promise<IdeasSectionEntity> {
    return this.manager.save(
      this.manager.create(IdeasSectionEntity, { ...data, page }),
    );
  }

  saveSection(
    section: Partial<IdeasSectionEntity>,
  ): Promise<IdeasSectionEntity> {
    return this.manager.save(IdeasSectionEntity, section);
  }

  findSections(pageId: string): Promise<IdeasSectionEntity[]> {
    return this.manager.find(IdeasSectionEntity, {
      where: { page: { id: pageId } },
    });
  }

  async removeSections(sections: IdeasSectionEntity[]): Promise<void> {
    if (sections.length === 0) return;
    await this.manager.remove(IdeasSectionEntity, sections);
  }

  findMediaOfSections(sectionIds: string[]): Promise<MediaItemEntity[]> {
    if (sectionIds.length === 0) return Promise.resolve([]);
    return this.manager.find(MediaItemEntity, {
      where: {
        targetId: In(sectionIds),
        targetType: MediaTargetType.IdeasSection,
      },
      order: { createdAt: "ASC", id: "ASC" },
    });
  }

  saveMedia(media: Partial<MediaItemEntity>): Promise<MediaItemEntity> {
    return this.manager.save(MediaItemEntity, media);
  }

  async removeMedia(items: MediaItemEntity[]): Promise<void> {
    if (items.length === 0) return;
    await this.manager.delete(MediaItemEntity, {
      id: In(items.map((item) => item.id)),
    });
  }

  /** Remove a página, a rota e confere que as seções saíram junto (falha desfaz tudo). */
  async removePageWithRoute(
    page: IdeasPageEntity,
    sectionIds: string[],
  ): Promise<boolean> {
    if (page.route?.id) {
      await this.manager.save(IdeasPageEntity, { id: page.id, route: null });
      await this.manager.delete(RouteEntity, { id: page.route.id });
    }
    await this.manager.remove(page);
    if (sectionIds.length === 0) return true;
    const remaining = await this.manager.count(IdeasSectionEntity, {
      where: { id: In(sectionIds) },
    });
    return remaining === 0;
  }
}

@Injectable()
export class IdeasPageWriteRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Commit se o trabalho termina; rollback se lança. */
  transaction<T>(work: (tx: IdeasPageTransaction) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      work(new IdeasPageTransaction(manager)),
    );
  }
}
