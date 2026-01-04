import { BaseEntity } from "src/shared/entity/base.entity";
import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { IdeasPageEntity } from "../../ideas-page/entities/ideas-page.entity";
import { UserEntity } from "src/core/user/entities/user.entity";

@Entity({ name: 'ideas_sections' })
export class IdeasSectionEntity extends BaseEntity {
  @Column({ length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column({ default: false })
  public: boolean;

  @ManyToOne(() => IdeasPageEntity, (page) => page.sections, {
    onDelete: 'CASCADE',
  })
  page: IdeasPageEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;
}