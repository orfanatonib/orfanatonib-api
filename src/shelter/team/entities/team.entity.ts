import { BaseEntity } from 'src/shared/entity/base.entity';
import { Entity, Column, ManyToOne, OneToMany, JoinColumn, ManyToMany } from 'typeorm';
import { ShelterEntity } from 'src/shelter/shelter/entities/shelter.entity/shelter.entity';
import { LeaderProfileEntity } from 'src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity';
import { MemberProfileEntity } from 'src/shelter/member-profile/entities/member-profile.entity/member-profile.entity';

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

  @OneToMany(() => MemberProfileEntity, (member) => member.team, {
    cascade: false,
  })
  members: MemberProfileEntity[];
}

