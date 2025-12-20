import { BaseEntity } from 'src/share/share-entity/base.entity';
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ShelteredEntity } from 'src/modules/sheltered/entities/sheltered.entity';
import { DecisionType } from '../enums/decision-type.enum';

@Entity('accepted_christs')
export class AcceptedChristEntity extends BaseEntity {
  @Column({
    type: 'enum',
    enum: DecisionType,
    nullable: true,
    default: null,
  })
  decision: DecisionType | null;

  @ManyToOne(() => ShelteredEntity, (sheltered) => sheltered.acceptedChrists, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'sheltered_id' })
  sheltered: ShelteredEntity;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes?: string | null;
}
