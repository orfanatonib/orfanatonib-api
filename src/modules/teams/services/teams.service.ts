import { Injectable } from '@nestjs/common';
import { TeamsRepository } from '../repositories/teams.repository';
import { CreateTeamDto } from '../dto/create-team.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';
import { TeamResponseDto } from '../dto/team-response.dto';
import { TeamEntity } from '../entities/team.entity';

@Injectable()
export class TeamsService {
  constructor(private readonly repository: TeamsRepository) {}

  async create(dto: CreateTeamDto): Promise<TeamResponseDto> {
    const team = await this.repository.create(dto);
    return this.toDto(team);
  }

  async findAll(): Promise<TeamResponseDto[]> {
    const teams = await this.repository.findAll();
    return teams.map(team => this.toDto(team));
  }

  async findOne(id: string): Promise<TeamResponseDto> {
    const team = await this.repository.findOne(id);
    if (!team) {
      throw new Error('Team não encontrado');
    }
    return this.toDto(team);
  }

  async findByShelter(shelterId: string): Promise<TeamResponseDto[]> {
    const teams = await this.repository.findByShelter(shelterId);
    return teams.map(team => this.toDto(team));
  }

  async findByLeader(leaderId: string): Promise<TeamResponseDto[]> {
    const teams = await this.repository.findByLeader(leaderId);
    return teams.map(team => this.toDto(team));
  }

  async findTeamByShelterAndNumber(shelterId: string, numberTeam: number): Promise<TeamResponseDto | null> {
    const team = await this.repository.findTeamByShelterAndNumber(shelterId, numberTeam);
    return team ? this.toDto(team) : null;
  }

  async addLeadersToTeam(teamId: string, leaderProfileIds: string[]): Promise<TeamResponseDto> {
    const team = await this.repository.addLeadersToTeam(teamId, leaderProfileIds);
    return this.toDto(team);
  }

  async removeLeadersFromTeam(teamId: string, leaderProfileIds: string[]): Promise<TeamResponseDto> {
    const team = await this.repository.removeLeadersFromTeam(teamId, leaderProfileIds);
    return this.toDto(team);
  }

  async removeLeaderFromAllTeams(leaderId: string): Promise<void> {
    return this.repository.removeLeaderFromAllTeams(leaderId);
  }

  async update(id: string, dto: UpdateTeamDto): Promise<TeamResponseDto> {
    const team = await this.repository.update(id, dto);
    return this.toDto(team);
  }

  async remove(id: string): Promise<void> {
    await this.repository.remove(id);
  }

  private toDto(entity: TeamEntity): TeamResponseDto {
    return {
      id: entity.id,
      numberTeam: entity.numberTeam,
      description: entity.description,
      shelterId: entity.shelter?.id || '',
      leaders: (entity.leaders || []).map(leader => ({
        id: leader.id || '', // ID do perfil
        name: leader.user?.name || '',
        email: leader.user?.email || '',
        phone: leader.user?.phone || '',
      })),
      teachers: (entity.teachers || []).map(teacher => ({
        id: teacher.id || '', // ID do perfil
        name: teacher.user?.name || '',
        email: teacher.user?.email || '',
        phone: teacher.user?.phone || '',
      })),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

