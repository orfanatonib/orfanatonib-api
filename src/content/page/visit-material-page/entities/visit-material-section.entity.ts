import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";

import { BaseEntity } from "src/shared/entity/base.entity";
import { VisitMaterialCategory } from "../enums/visit-material-category.enum";
import { VisitMaterialsPageEntity } from "./visit-material-page.entity";

/**
 * Seção de uma categoria (faixa etária) da página de material de visita. As mídias da seção ficam em
 * `media_items` com `targetType = VisitMaterialsSection` e `targetId = id` da seção.
 */
@Entity("visit_material_sections")
@Index("uq_visit_material_section_page_category", ["pageId", "category"], {
  unique: true,
})
export class VisitMaterialSectionEntity extends BaseEntity {
  @Column({ name: "page_id", type: "varchar", length: 36 })
  pageId: string;

  @Column({ type: "enum", enum: VisitMaterialCategory })
  category: VisitMaterialCategory;

  /** Título opcional da seção; sem ele a tela usa o nome da categoria. */
  @Column({ type: "varchar", length: 180, nullable: true })
  title: string | null;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "smallint", unsigned: true, default: 0 })
  position: number;

  @ManyToOne(() => VisitMaterialsPageEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "page_id" })
  page: VisitMaterialsPageEntity;
}
