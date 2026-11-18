import { Injectable, NotFoundException } from "@nestjs/common";
import { TeamsRepository } from "../repositories/teams.repository";
import { TeamResponseDto } from "../dto/team-response.dto";
import { TeamEntity } from "../entities/team.entity";

@Injectable()
export class GetTeamsService {
  constructor(private readonly repository: TeamsRepository) {}

  async findAll(): Promise<TeamResponseDto[]> {
    const teams = await this.repository.findAll();
    return teams.map((team) => this.toDto(team));
  }

  async findOne(id: string): Promise<TeamResponseDto> {
    const team = await this.repository.findOne(id);
    if (!team) {
      throw new NotFoundException("Equipe não encontrada");
    }
    return this.toDto(team);
  }

  async findByShelter(shelterId: string): Promise<TeamResponseDto[]> {
    const teams = await this.repository.findByShelter(shelterId);
    return teams.map((team) => this.toDto(team));
  }

  async findByLeader(userId: string): Promise<TeamResponseDto[]> {
    const leaderProfile =
      await this.repository.findLeaderProfileByUserId(userId);

    if (!leaderProfile) {
      return [];
    }

    const teams = await this.repository.findByLeader(leaderProfile.id);
    return teams.map((team) => this.toDto(team));
  }

  /** Abrigos em que o usuário lidera ao menos uma equipe (escopo de escrita do líder). */
  async findLedShelterIds(userId: string): Promise<Set<string>> {
    const teams = await this.findByLeader(userId);
    return new Set(teams.map((team) => team.shelterId));
  }

  async findTeamByShelterAndNumber(
    shelterId: string,
    numberTeam: number,
  ): Promise<TeamResponseDto | null> {
    const team = await this.repository.findTeamByShelterAndNumber(
      shelterId,
      numberTeam,
    );
    return team ? this.toDto(team) : null;
  }

  async findOneEntity(id: string): Promise<TeamEntity | null> {
    return this.repository.findOne(id);
  }

  async findByUserContext(
    userId: string,
    role: string,
  ): Promise<TeamResponseDto[]> {
    if (role === "admin") {
      return this.findAll();
    }

    if (role === "leader") {
      return this.findByLeader(userId);
    }

    if (role === "member") {
      const allTeams = await this.repository.findAll();

      const memberTeams = allTeams.filter((team) => {
        return (
          team.members &&
          team.members.some((member) => member.user?.id === userId)
        );
      });

      return memberTeams.map((team) => this.toDto(team));
    }

    return [];
  }

  public toDto(entity: TeamEntity): TeamResponseDto {
    return {
      id: entity.id,
      numberTeam: entity.numberTeam,
      description: entity.description,
      shelterId: entity.shelter?.id || "",
      shelter: entity.shelter
        ? {
            id: entity.shelter.id,
            name: entity.shelter.name,
            description: entity.shelter.description,
            address: entity.shelter.address
              ? {
                  street: entity.shelter.address.street ?? undefined,
                  number: entity.shelter.address.number,
                  district: entity.shelter.address.district ?? undefined,
                  city: entity.shelter.address.city,
                  state: entity.shelter.address.state,
                  postalCode: entity.shelter.address.postalCode ?? undefined,
                  complement: entity.shelter.address.complement,
                }
              : undefined,
          }
        : undefined,
      leaders: (entity.leaders || []).map((leader) => ({
        id: leader.id || "",
        name: leader.user?.name || "",
        email: leader.user?.email || "",
        phone: leader.user?.phone || "",
      })),
      members: (entity.members || []).map((member) => ({
        id: member.id || "",
        name: member.user?.name || "",
        email: member.user?.email || "",
        phone: member.user?.phone || "",
      })),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
