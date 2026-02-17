import { BaseEntity } from 'src/shared/entity/base.entity';
import { Entity, Column } from 'typeorm';
import { AttendableType } from './attendable-type.enum';

@Entity('atendentes')
export class AtendenteEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string;

  @Column({ type: 'enum', enum: AttendableType, nullable: true })
  attendableType?: AttendableType | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  attendableId?: string | null;
}
