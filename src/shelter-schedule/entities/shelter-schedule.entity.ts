import { BaseEntity } from 'src/share/share-entity/base.entity';
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { TeamEntity } from 'src/modules/teams/entities/team.entity';
import { EventEntity } from 'src/event/entities/event.entity';

@Entity('shelter_schedules')
export class ShelterScheduleEntity extends BaseEntity {
  @Column({ type: 'int' })
  visitNumber!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  visitDate?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  meetingDate?: string;

  @Column({ type: 'text' })
  lessonContent!: string;

  @Column({ type: 'text', nullable: true })
  observation?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  meetingRoom?: string;

  @ManyToOne(() => TeamEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: TeamEntity;

  @OneToMany(() => EventEntity, (event) => event.shelterSchedule, { cascade: false })
  events?: EventEntity[];
}
