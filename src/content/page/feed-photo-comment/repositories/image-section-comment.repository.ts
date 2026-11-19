import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { ImageSectionCommentEntity } from "../entities/image-section-comment.entity";

@Injectable()
export class ImageSectionCommentRepository extends Repository<ImageSectionCommentEntity> {
  constructor(dataSource: DataSource) {
    super(ImageSectionCommentEntity, dataSource.createEntityManager());
  }

  findPageBySection(
    sectionId: string,
    page: number,
    limit: number,
  ): Promise<[ImageSectionCommentEntity[], number]> {
    return this.findAndCount({
      where: { sectionId },
      relations: ["author"],
      order: { createdAt: "DESC", id: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findWithAuthor(id: string): Promise<ImageSectionCommentEntity | null> {
    return this.findOne({ where: { id }, relations: ["author"] });
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
}
