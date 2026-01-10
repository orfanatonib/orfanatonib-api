import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { RouteEntity } from 'src/infrastructure/route/route-page.entity';
import { BaseEntity } from 'src/shared/entity/base.entity';

export enum TestamentType {
  OLD_TESTAMENT = 'OLD_TESTAMENT',
  NEW_TESTAMENT = 'NEW_TESTAMENT',
}

@Entity('visit_material_pages')
export class VisitMaterialsPageEntity extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'text' })
  subtitle: string;

  @Column({ type: 'enum', enum: TestamentType, default: TestamentType.OLD_TESTAMENT })
  testament: TestamentType;

  @Column({ default: false })
  currentWeek: boolean;

  @Column({ type: 'text' })
  description: string;

  @OneToOne(() => RouteEntity, {
    cascade: true,
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  route: RouteEntity;
}

