import { BaseEntity } from 'src/shared/entity/base.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from 'src/core/user/entities/user.entity';
import { ShelterScheduleEntity } from 'src/shelter/schedule/entities/shelter-schedule.entity';

export enum AttendanceType {
  PRESENT = 'present',
  ABSENT = 'absent',
}

@Entity('attendance_records')
export class AttendanceEntity extends BaseEntity {
  @ManyToOne(() => UserEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member!: UserEntity;

  @ManyToOne(() => ShelterScheduleEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shelter_schedule_id' })
  shelterSchedule!: ShelterScheduleEntity;

  @Column({ type: 'enum', enum: AttendanceType })
  type!: AttendanceType;

  @Column({ type: 'text', nullable: true })
  comment?: string;
}
