import { BaseEntity } from 'src/shared/entity/base.entity';
import { Entity, Column, ManyToOne, OneToOne, JoinColumn, Unique } from 'typeorm';
import { TeamEntity } from 'src/shelter/team/entities/team.entity';
import { UserEntity } from 'src/core/user/entities/user.entity';

@Unique('UQ_member_profile_user', ['user'])
@Entity('member_profiles')
export class MemberProfileEntity extends BaseEntity {
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @ManyToOne(() => TeamEntity, (team) => team.members, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'team_id' })
  team: TeamEntity | null;

  @OneToOne(() => UserEntity, (user) => user.memberProfile, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
