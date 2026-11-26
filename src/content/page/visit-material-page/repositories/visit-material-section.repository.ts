import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, Repository } from "typeorm";

import { VisitMaterialSectionEntity } from "../entities/visit-material-section.entity";

@Injectable()
export class VisitMaterialSectionRepository {
  constructor(
    @InjectRepository(VisitMaterialSectionEntity)
    private readonly repository: Repository<VisitMaterialSectionEntity>,
  ) {}

  private scoped(
    manager?: EntityManager,
  ): Repository<VisitMaterialSectionEntity> {
    return manager
      ? manager.getRepository(VisitMaterialSectionEntity)
      : this.repository;
  }

  findByPageId(
    pageId: string,
    manager?: EntityManager,
  ): Promise<VisitMaterialSectionEntity[]> {
    return this.scoped(manager).find({
      where: { pageId },
      order: { position: "ASC" },
    });
  }

  findByPageIds(
    pageIds: readonly string[],
  ): Promise<VisitMaterialSectionEntity[]> {
    if (pageIds.length === 0) return Promise.resolve([]);
    return this.repository.find({
      where: { pageId: In([...pageIds]) },
      order: { position: "ASC" },
    });
  }

  create(
    partial: Partial<VisitMaterialSectionEntity>,
    manager?: EntityManager,
  ): VisitMaterialSectionEntity {
    return this.scoped(manager).create(partial);
  }

  save(
    section: VisitMaterialSectionEntity,
    manager?: EntityManager,
  ): Promise<VisitMaterialSectionEntity> {
    return this.scoped(manager).save(section);
  }

  async remove(
    section: VisitMaterialSectionEntity,
    manager?: EntityManager,
  ): Promise<void> {
    await this.scoped(manager).remove(section);
  }
}
