import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { In, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { TeamEntity } from "../entities/team.entity";
import { CreateTeamDto } from "../dto/create-team.dto";
import { UpdateTeamDto } from "../dto/update-team.dto";
import { MemberProfileEntity } from "src/shelter/member-profile/entities/member-profile.entity/member-profile.entity";
import { LeaderProfileEntity } from "src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity";

@Injectable()
export class TeamsRepository {
  constructor(
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(LeaderProfileEntity)
    private readonly leaderProfileRepo: Repository<LeaderProfileEntity>,
  ) {}

  /** Um abrigo não tem duas equipes com o mesmo número (o banco não tem índice único). */
  private async assertNumberAvailable(
    shelterId: string,
    numberTeam: number,
    ignoreTeamId?: string,
  ): Promise<void> {
    const existing = await this.findTeamByShelterAndNumber(
      shelterId,
      numberTeam,
    );
    if (existing && existing.id !== ignoreTeamId) {
      throw new ConflictException(
        `O abrigo já tem a equipe ${numberTeam}. Escolha outro número.`,
      );
    }
  }

  /** Ids de líder inexistentes são erro (antes eram descartados em silêncio). */
  private async resolveLeaders(ids: string[]): Promise<LeaderProfileEntity[]> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return [];
    const found = await this.leaderProfileRepo.findBy({ id: In(unique) });
    if (found.length !== unique.length) {
      throw new NotFoundException("Líder não encontrado.");
    }
    return found;
  }

  private async resolveMembers(ids: string[]): Promise<MemberProfileEntity[]> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return [];
    const found = await this.teamRepo.manager
      .getRepository(MemberProfileEntity)
      .findBy({ id: In(unique) });
    if (found.length !== unique.length) {
      throw new NotFoundException("Membro não encontrado.");
    }
    return found;
  }

  async create(dto: CreateTeamDto): Promise<TeamEntity> {
    await this.assertNumberAvailable(dto.shelterId, dto.numberTeam);
    const leaders = await this.resolveLeaders(dto.leaderProfileIds ?? []);
    const members = await this.resolveMembers(dto.memberProfileIds ?? []);
    const team = this.teamRepo.create({
      numberTeam: dto.numberTeam,
      description: dto.description,
      shelter: { id: dto.shelterId },
      leaders,
      members,
    });
    return this.teamRepo.save(team);
  }

  async findAll(): Promise<TeamEntity[]> {
    return this.teamRepo.find({
      relations: [
        "shelter",
        "shelter.address",
        "leaders",
        "leaders.user",
        "members",
        "members.user",
      ],
    });
  }

  async findOne(id: string): Promise<TeamEntity | null> {
    return this.teamRepo.findOne({
      where: { id },
      relations: [
        "shelter",
        "shelter.address",
        "leaders",
        "leaders.user",
        "members",
        "members.user",
      ],
    });
  }

  async findByShelter(shelterId: string): Promise<TeamEntity[]> {
    return this.teamRepo.find({
      where: { shelter: { id: shelterId } },
      relations: [
        "shelter",
        "leaders",
        "leaders.user",
        "members",
        "members.user",
      ],
    });
  }

  async findByLeader(leaderProfileId: string): Promise<TeamEntity[]> {
    return this.teamRepo
      .createQueryBuilder("team")
      .leftJoinAndSelect("team.shelter", "shelter")
      .leftJoinAndSelect("shelter.address", "address")
      .leftJoinAndSelect("team.leaders", "leaders")
      .leftJoinAndSelect("leaders.user", "leaderUser")
      .leftJoinAndSelect("team.members", "members")
      .leftJoinAndSelect("members.user", "memberUser")
      .where("leaders.id = :leaderProfileId", { leaderProfileId })
      .getMany();
  }

  async findLeaderProfileByUserId(
    userId: string,
  ): Promise<LeaderProfileEntity | null> {
    return this.leaderProfileRepo.findOne({
      where: { user: { id: userId } },
      relations: ["user"],
    });
  }

  async findTeamByShelterAndNumber(
    shelterId: string,
    numberTeam: number,
  ): Promise<TeamEntity | null> {
    return this.teamRepo.findOne({
      where: {
        shelter: { id: shelterId },
        numberTeam: numberTeam,
      },
      relations: [
        "shelter",
        "leaders",
        "leaders.user",
        "members",
        "members.user",
      ],
    });
  }

  async addLeadersToTeam(
    teamId: string,
    leaderProfileIds: string[],
  ): Promise<TeamEntity> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: [
        "leaders",
        "leaders.user",
        "shelter",
        "members",
        "members.user",
      ],
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    const leaders = await this.leaderProfileRepo.findByIds(leaderProfileIds);

    if (!team.leaders) {
      team.leaders = [];
    }

    const existingLeaderIds = new Set(team.leaders.map((l) => l.id));
    const newLeaders = leaders.filter(
      (leader) => !existingLeaderIds.has(leader.id),
    );
    team.leaders.push(...newLeaders);

    return this.teamRepo.save(team);
  }

  async removeLeadersFromTeam(
    teamId: string,
    leaderProfileIds: string[],
  ): Promise<TeamEntity> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: [
        "leaders",
        "leaders.user",
        "shelter",
        "members",
        "members.user",
      ],
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    const leaderIdsSet = new Set(leaderProfileIds);
    team.leaders = team.leaders.filter(
      (leader) => !leaderIdsSet.has(leader.id),
    );

    return this.teamRepo.save(team);
  }

  async removeLeaderFromAllTeams(leaderId: string): Promise<void> {
    const teams = await this.teamRepo.find({
      where: {},
      relations: ["leaders"],
    });

    const teamsWithLeader = teams.filter(
      (team) =>
        team.leaders && team.leaders.some((leader) => leader.id === leaderId),
    );

    for (const team of teamsWithLeader) {
      team.leaders = team.leaders.filter((leader) => leader.id !== leaderId);
      await this.teamRepo.save(team);
    }
  }

  async update(id: string, dto: UpdateTeamDto): Promise<TeamEntity> {
    const team = await this.teamRepo.findOne({
      where: { id },
      relations: ["leaders", "members", "shelter"],
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    if (dto.numberTeam !== undefined && dto.numberTeam !== team.numberTeam) {
      await this.assertNumberAvailable(team.shelter.id, dto.numberTeam, id);
    }
    if (dto.numberTeam !== undefined) team.numberTeam = dto.numberTeam;
    if (dto.description !== undefined) team.description = dto.description;

    if (dto.leaderProfileIds !== undefined) {
      team.leaders = await this.resolveLeaders(dto.leaderProfileIds);
    }

    if (dto.memberProfileIds !== undefined) {
      team.members = await this.resolveMembers(dto.memberProfileIds);
    }

    return this.teamRepo.save(team);
  }

  /**
   * Remove a equipe soltando antes os vínculos que a prendem: os líderes saem de `leader_teams` e
   * os membros ficam sem equipe (o perfil de ninguém é apagado). Tudo na mesma transação.
   */
  async remove(id: string): Promise<void> {
    await this.teamRepo.manager.transaction(async (manager) => {
      await manager.query(`DELETE FROM leader_teams WHERE team_id = ?`, [id]);
      await manager.query(
        `UPDATE member_profiles SET team_id = NULL WHERE team_id = ?`,
        [id],
      );
      await manager.getRepository(TeamEntity).delete(id);
    });
  }
}
