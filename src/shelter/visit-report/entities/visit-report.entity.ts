import { BaseEntity } from 'src/shared/entity/base.entity';
import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ShelterScheduleEntity } from 'src/shelter/schedule/entities/shelter-schedule.entity';

@Entity('visit_reports')
@Unique('UQ_visit_report_schedule', ['schedule'])
export class VisitReportEntity extends BaseEntity {
  @Column({ type: 'int', default: 0 })
  teamMembersPresent!: number;

  @Column({ type: 'int', default: 0 })
  shelteredHeardMessage!: number;

  @Column({ type: 'int', default: 0 })
  caretakersHeardMessage!: number;

  @Column({ type: 'int', default: 0 })
  shelteredDecisions!: number;

  @Column({ type: 'int', default: 0 })
  caretakersDecisions!: number;

  @Column({ type: 'longtext', nullable: true })
  observation?: string;

  @ManyToOne(() => ShelterScheduleEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule!: ShelterScheduleEntity;
}
