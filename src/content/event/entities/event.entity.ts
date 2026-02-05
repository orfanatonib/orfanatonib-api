import { BaseEntity } from 'src/shared/entity/base.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ShelterScheduleEntity } from 'src/shelter/schedule/entities/shelter-schedule.entity';

export enum EventAudience {
  ALL = 'all',
  MEMBERS = 'members',
  LEADERS = 'leaders',
}

export enum EventType {
  VISIT = 'visit',
  MEETING = 'meeting',
  CUSTOM = 'custom',
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

  @Column({ type: 'enum', enum: EventType, nullable: true, default: EventType.CUSTOM })
  eventType?: EventType;

  @ManyToOne(() => ShelterScheduleEntity, (schedule) => schedule.events, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shelter_schedule_id' })
  shelterSchedule?: ShelterScheduleEntity;
} 
