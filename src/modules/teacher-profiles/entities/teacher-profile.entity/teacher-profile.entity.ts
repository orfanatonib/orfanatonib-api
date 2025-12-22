import { BaseEntity } from 'src/share/share-entity/base.entity';
import { Entity, Column, ManyToOne, OneToOne, JoinColumn, Unique } from 'typeorm';
import { TeamEntity } from 'src/modules/teams/entities/team.entity';
import { UserEntity } from 'src/user/user.entity';

@Unique('UQ_teacher_profile_user', ['user'])
@Entity('teacher_profiles')
export class TeacherProfileEntity extends BaseEntity {
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @ManyToOne(() => TeamEntity, (team) => team.teachers, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'team_id' })
  team: TeamEntity | null;

  @OneToOne(() => UserEntity, (user) => user.teacherProfile, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
