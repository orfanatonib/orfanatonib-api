import { TeamEntity } from 'src/shelter/team/entities/team.entity';
import { BaseEntity } from 'src/shared/entity/base.entity';
import { UserEntity } from 'src/core/user/entities/user.entity';
import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  Unique,
  ManyToMany,
  JoinTable,
} from 'typeorm';

@Unique('UQ_leader_profile_user', ['user'])
@Entity('leader_profiles')
export class LeaderProfileEntity extends BaseEntity {
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @OneToOne(() => UserEntity, (user) => user.leaderProfile, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToMany(() => TeamEntity, (team) => team.leaders, {
    cascade: false,
  })
  @JoinTable({
    name: 'leader_teams',
    joinColumn: { name: 'leader_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'team_id', referencedColumnName: 'id' },
  })
  teams: TeamEntity[];
}
