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
    const dtos = teams.map(team => this.toDto(team));
    return dtos;
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

  async findByLeader(userId: string): Promise<TeamResponseDto[]> {
    const leaderProfile = await this.repository.findLeaderProfileByUserId(userId);

    if (!leaderProfile) {
      return [];
    }

    const teams = await this.repository.findByLeader(leaderProfile.id);
    const dtos = teams.map(team => this.toDto(team));
    return dtos;
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

  async findOneEntity(id: string): Promise<TeamEntity | null> {
    return this.repository.findOne(id);
  }

  async findByUserContext(userId: string, role: string): Promise<TeamResponseDto[]> {
    if (role === 'admin') {
      return this.findAll();
    }

    if (role === 'leader') {
      return this.findByLeader(userId);
    }

    if (role === 'member') {
      const allTeams = await this.repository.findAll();

      const memberTeams = allTeams.filter(team => {
        return team.members && team.members.some(member => member.user?.id === userId);
      });

      return memberTeams.map(team => this.toDto(team));
    }

    return [];
  }

  private toDto(entity: TeamEntity): TeamResponseDto {
    return {
      id: entity.id,
      numberTeam: entity.numberTeam,
      description: entity.description,
      shelterId: entity.shelter?.id || '',
      shelter: entity.shelter ? {
        id: entity.shelter.id,
        name: entity.shelter.name,
        description: entity.shelter.description,
        address: entity.shelter.address ? {
          street: entity.shelter.address.street ?? undefined,
          number: entity.shelter.address.number,
          district: entity.shelter.address.district ?? undefined,
          city: entity.shelter.address.city,
          state: entity.shelter.address.state,
          postalCode: entity.shelter.address.postalCode ?? undefined,
          complement: entity.shelter.address.complement,
        } : undefined,
      } : undefined,
      leaders: (entity.leaders || []).map(leader => ({
        id: leader.id || '', // ID do perfil
        name: leader.user?.name || '',
        email: leader.user?.email || '',
        phone: leader.user?.phone || '',
      })),
      members: (entity.members || []).map(member => ({
        id: member.id || '', // ID do perfil
        name: member.user?.name || '',
        email: member.user?.email || '',
        phone: member.user?.phone || '',
      })),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

