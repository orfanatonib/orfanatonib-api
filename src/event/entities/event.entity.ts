import { BaseEntity } from 'src/share/share-entity/base.entity';
import { Entity, Column } from 'typeorm';

export enum EventAudience {
  ALL = 'all',
  TEACHERS = 'teachers',
  LEADERS = 'leaders',
}

@Entity('events')
export class EventEntity extends BaseEntity {
  @Column()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  date!: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ type: 'enum', enum: EventAudience, default: EventAudience.ALL })
  audience!: EventAudience;
} 
