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
    console.log('[TeamsService.findAll] Fetching all teams from repository');
    const teams = await this.repository.findAll();
    console.log(`[TeamsService.findAll] Got ${teams.length} teams from repo`);
    const dtos = teams.map(team => this.toDto(team));
    console.log(`[TeamsService.findAll] Converted to ${dtos.length} DTOs`);
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
    console.log(`[TeamsService.findByLeader] Fetching teams for user ${userId}`);
    
    // Get leader profile by userId
    try {
      const leaderProfile = await this.repository.findLeaderProfileByUserId(userId);
      console.log(`[TeamsService.findByLeader] Leader profile:`, leaderProfile ? `ID=${leaderProfile.id}` : 'NOT FOUND');
      
      if (!leaderProfile) {
        console.warn(`[TeamsService.findByLeader] No leader profile found for userId ${userId}`);
        return [];
      }
      
      const teams = await this.repository.findByLeader(leaderProfile.id);
      console.log(`[TeamsService.findByLeader] Got ${teams.length} teams from repo`);
      const dtos = teams.map(team => this.toDto(team));
      console.log(`[TeamsService.findByLeader] Converted to ${dtos.length} DTOs`);
      return dtos;
    } catch (error) {
      console.error(`[TeamsService.findByLeader] ERROR:`, error);
      throw error;
    }
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
    console.log(`\n[TeamsService.findByUserContext] Called with userId=${userId}, role=${role}`);
    
    if (role === 'admin') {
      console.log('[TeamsService] Role is admin - fetching all teams');
      const result = await this.findAll();
      console.log(`[TeamsService] Admin returning ${result.length} teams`);
      return result;
    }

    if (role === 'leader') {
      console.log(`[TeamsService] Role is leader - fetching teams for leader ${userId}`);
      const result = await this.findByLeader(userId);
      console.log(`[TeamsService] Leader returning ${result.length} teams`);
      return result;
    }

    // For members, find the team they belong to
    if (role === 'member') {
      console.log(`[TeamsService] Role is member - fetching all teams to filter`);
      const allTeams = await this.repository.findAll();
      console.log(`[TeamsService] Found ${allTeams.length} total teams`);
      
      const memberTeams = allTeams.filter(team => {
        const isInTeam = team.members && team.members.some(member => member.user?.id === userId);
        console.log(`[TeamsService] Team ${team.id}: hasMembers=${!!team.members}, isMemberInTeam=${isInTeam}`);
        return isInTeam;
      });
      
      console.log(`[TeamsService] Member returning ${memberTeams.length} teams`);
      const dtos = memberTeams.map(team => this.toDto(team));
      console.log(`[TeamsService] Converted to ${dtos.length} DTOs`);
      return dtos;
    }

    console.log(`[TeamsService] Unknown role "${role}" - returning empty array`);
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

