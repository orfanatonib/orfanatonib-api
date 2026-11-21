import { Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, Repository, IsNull, Not } from "typeorm";
import { ImageSectionEntity } from "../../image-page/entities/image-section.entity";
import { ImageSectionReviewStatus } from "../enums/image-section-review-status.enum";

@Injectable()
export class ImageSectionRepository extends Repository<ImageSectionEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(ImageSectionEntity, dataSource.createEntityManager());
  }

  async findByPageId(pageId: string): Promise<ImageSectionEntity[]> {
    return this.find({
      where: { page: { id: pageId } },
      relations: ["page"],
    });
  }

  /** Seção já publicada numa galeria (com a página carregada), ou `null`. */
  async findPublishedById(id: string): Promise<ImageSectionEntity | null> {
    return this.findOne({
      where: { id, page: Not(IsNull()) },
      relations: ["page"],
    });
  }

  async findAllOrphanSections(): Promise<ImageSectionEntity[]> {
    return this.find({
      where: { page: IsNull() },
    });
  }

  async upsertSection(
    sectionData: Partial<ImageSectionEntity>,
  ): Promise<ImageSectionEntity> {
    if (sectionData.id) {
      const existing = await this.findOne({ where: { id: sectionData.id } });

      if (!existing) {
        throw new NotFoundException(
          `Seção com ID=${sectionData.id} não encontrada.`,
        );
      }

      const merged = this.merge(existing, sectionData);
      return this.save(merged);
    }

    const created = this.create(sectionData);
    return this.save(created);
  }

  /** Publicações de um autor (qualquer estado), da mais recente à mais antiga. */
  async findByAuthor(authorId: string): Promise<ImageSectionEntity[]> {
    return this.find({
      where: { author: { id: authorId } },
      order: { createdAt: "DESC" },
    });
  }

  /** Fila de moderação (sem galeria), opcionalmente só de um autor. */
  async findAllOrfaSections(authorId?: string): Promise<ImageSectionEntity[]> {
    return this.find({
      where: {
        page: IsNull(),
        ...(authorId ? { author: { id: authorId } } : {}),
      },
      relations: ["author"],
    });
  }

  /** Publicações aguardando revisão (selo do painel do admin). */
  countPending(): Promise<number> {
    return this.countBy({ reviewStatus: ImageSectionReviewStatus.PENDING });
  }
}
