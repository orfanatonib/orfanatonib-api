import { Entity, Column, Index, OneToOne, JoinColumn } from "typeorm";
import { RouteEntity } from "src/infrastructure/route/route-page.entity";
import { BaseEntity } from "src/shared/entity/base.entity";
import { TestamentType } from "../enums/testament-type.enum";

@Entity("visit_material_pages")
export class VisitMaterialsPageEntity extends BaseEntity {
  @Index('uq_visit_material_source_lesson', { unique: true })
  @Column({ type: 'varchar', length: 36, nullable: true })
  sourceLessonId: string | null;

  @Column()
  title: string;

  @Column({ type: "text" })
  subtitle: string;

  @Column({
    type: "enum",
    enum: TestamentType,
    default: TestamentType.OLD_TESTAMENT,
  })
  testament: TestamentType;

  @Column({ default: false })
  currentWeek: boolean;

  @Column({ type: "text" })
  description: string;

  @OneToOne(() => RouteEntity, {
    cascade: true,
    eager: true,
    onDelete: "CASCADE",
  })
  @JoinColumn()
  route: RouteEntity;
}
