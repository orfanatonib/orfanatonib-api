import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { ImageSectionCelebrationEntity } from "../entities/image-section-celebration.entity";

@Injectable()
export class ImageSectionCelebrationRepository extends Repository<ImageSectionCelebrationEntity> {
  constructor(dataSource: DataSource) {
    super(ImageSectionCelebrationEntity, dataSource.createEntityManager());
  }

  async insertCelebration(sectionId: string, userId: string): Promise<void> {
    await this.insert({ sectionId, userId });
  }

  /** Devolve quantas linhas foram removidas (0 = não havia celebração). */
  async deleteByUser(sectionId: string, userId: string): Promise<number> {
    const result = await this.delete({ sectionId, userId });
    return result.affected ?? 0;
  }

  countBySection(sectionId: string): Promise<number> {
    return this.count({ where: { sectionId } });
  }

  existsByUser(sectionId: string, userId: string): Promise<boolean> {
    return this.exists({ where: { sectionId, userId } });
  }

  async countBySectionIds(sectionIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (sectionIds.length === 0) return counts;
    const rows = await this.createQueryBuilder("c")
      .select("c.sectionId", "sectionId")
      .addSelect("COUNT(*)", "total")
      .where("c.sectionId IN (:...sectionIds)", { sectionIds })
      .groupBy("c.sectionId")
      .getRawMany<{ sectionId: string; total: string }>();
    for (const row of rows) counts.set(row.sectionId, Number(row.total));
    return counts;
  }

  async findCelebratedSectionIds(
    userId: string,
    sectionIds: string[],
  ): Promise<Set<string>> {
    if (sectionIds.length === 0) return new Set();
    const rows = await this.createQueryBuilder("c")
      .select("c.sectionId", "sectionId")
      .where("c.userId = :userId", { userId })
      .andWhere("c.sectionId IN (:...sectionIds)", { sectionIds })
      .getRawMany<{ sectionId: string }>();
    return new Set(rows.map((row) => row.sectionId));
  }
}
