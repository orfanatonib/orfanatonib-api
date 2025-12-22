import { BaseEntity } from 'src/share/share-entity/base.entity';
import { Entity, Column, ManyToOne, OneToMany, JoinColumn, ManyToMany } from 'typeorm';
import { ShelterEntity } from 'src/modules/shelters/entities/shelter.entity/shelter.entity';
import { LeaderProfileEntity } from 'src/modules/leader-profiles/entities/leader-profile.entity/leader-profile.entity';
import { TeacherProfileEntity } from 'src/modules/teacher-profiles/entities/teacher-profile.entity/teacher-profile.entity';

@Entity('teams')
export class TeamEntity extends BaseEntity {
  @Column({ type: 'int' })
  numberTeam: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => ShelterEntity, (shelter) => shelter.teams, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'shelter_id' })
  shelter: ShelterEntity;

  @ManyToMany(() => LeaderProfileEntity, (leader) => leader.teams, {
    cascade: false,
  })
  leaders: LeaderProfileEntity[];

  @OneToMany(() => TeacherProfileEntity, (teacher) => teacher.team, {
    cascade: false,
  })
  teachers: TeacherProfileEntity[];
}

