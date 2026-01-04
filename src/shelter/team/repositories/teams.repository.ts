import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TeamEntity } from '../entities/team.entity';
import { CreateTeamDto } from '../dto/create-team.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';
import { LeaderProfileEntity } from 'src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity';

@Injectable()
export class TeamsRepository {
  constructor(
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(LeaderProfileEntity)
    private readonly leaderProfileRepo: Repository<LeaderProfileEntity>,
  ) {}

  async create(dto: CreateTeamDto): Promise<TeamEntity> {
    const team = this.teamRepo.create(dto);
    return this.teamRepo.save(team);
  }

  async findAll(): Promise<TeamEntity[]> {
    return this.teamRepo.find();
  }

  async findOne(id: string): Promise<TeamEntity | null> {
    return this.teamRepo.findOne({ where: { id } });
  }

  async findByShelter(shelterId: string): Promise<TeamEntity[]> {
    return this.teamRepo.find({
      where: { shelter: { id: shelterId } },
      relations: ['shelter', 'leaders', 'leaders.user', 'teachers', 'teachers.user'],
    });
  }

  async findByLeader(leaderProfileId: string): Promise<TeamEntity[]> {
    return this.teamRepo
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.shelter', 'shelter')
      .leftJoinAndSelect('shelter.address', 'address')
      .leftJoinAndSelect('team.leaders', 'leaders')
      .leftJoinAndSelect('leaders.user', 'leaderUser')
      .leftJoinAndSelect('team.teachers', 'teachers')
      .leftJoinAndSelect('teachers.user', 'teacherUser')
      .where('leaders.id = :leaderProfileId', { leaderProfileId })
      .getMany();
  }

  async findLeaderProfileByUserId(userId: string): Promise<LeaderProfileEntity | null> {
    return this.leaderProfileRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  }

  async findTeamByShelterAndNumber(shelterId: string, numberTeam: number): Promise<TeamEntity | null> {
    return this.teamRepo.findOne({
      where: {
        shelter: { id: shelterId },
        numberTeam: numberTeam,
      },
      relations: ['shelter', 'leaders', 'leaders.user', 'teachers', 'teachers.user'],
    });
  }

  async addLeadersToTeam(teamId: string, leaderProfileIds: string[]): Promise<TeamEntity> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['leaders', 'leaders.user', 'shelter', 'teachers', 'teachers.user'],
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    const leaders = await this.leaderProfileRepo.findByIds(leaderProfileIds);

    if (!team.leaders) {
      team.leaders = [];
    }

    // Add only new leaders (avoid duplicates)
    const existingLeaderIds = new Set(team.leaders.map(l => l.id));
    const newLeaders = leaders.filter(leader => !existingLeaderIds.has(leader.id));
    team.leaders.push(...newLeaders);

    return this.teamRepo.save(team);
  }

  async removeLeadersFromTeam(teamId: string, leaderProfileIds: string[]): Promise<TeamEntity> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['leaders', 'leaders.user', 'shelter', 'teachers', 'teachers.user'],
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    const leaderIdsSet = new Set(leaderProfileIds);
    team.leaders = team.leaders.filter(leader => !leaderIdsSet.has(leader.id));

    return this.teamRepo.save(team);
  }

  async removeLeaderFromAllTeams(leaderId: string): Promise<void> {
    const teams = await this.teamRepo.find({
      where: {},
      relations: ['leaders'],
    });

    const teamsWithLeader = teams.filter(team =>
      team.leaders && team.leaders.some(leader => leader.id === leaderId)
    );

    for (const team of teamsWithLeader) {
      team.leaders = team.leaders.filter(leader => leader.id !== leaderId);
      await this.teamRepo.save(team);
    }
  }

  async update(id: string, dto: UpdateTeamDto): Promise<TeamEntity> {
    await this.teamRepo.update(id, dto);
    const updated = await this.teamRepo.findOne({ where: { id } });
    if (!updated) throw new NotFoundException('Team not found after update');
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.teamRepo.delete(id);
  }
}

