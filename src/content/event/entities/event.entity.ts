import { BaseEntity } from 'src/shared/entity/base.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ShelterScheduleEntity } from 'src/shelter/schedule/entities/shelter-schedule.entity';

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

  @ManyToOne(() => ShelterScheduleEntity, (schedule) => schedule.events, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shelter_schedule_id' })
  shelterSchedule?: ShelterScheduleEntity;
} 
