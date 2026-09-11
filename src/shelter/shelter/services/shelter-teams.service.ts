import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { RuleException } from "src/common/exceptions";
import { TeamsService } from "src/shelter/team/services/teams.service";
import { CreateTeamDto } from "src/shelter/team/dto/create-team.dto";
import { UpdateTeamDto } from "src/shelter/team/dto/update-team.dto";
import { TeamInputDto } from "../dto/create-shelter.dto";
import { SHELTER_MESSAGES } from "../constants";

/**
 * As equipes de um abrigo. A criação e a atualização compartilham a mesma
 * validação e a mesma numeração: um abrigo com `teamsQuantity` N tem exatamente
 * as equipes 1..N, e o payload só personaliza as que quiser.
 */
@Injectable()
export class ShelterTeamsService {
  constructor(
    @Inject(forwardRef(() => TeamsService))
    private readonly teamsService: TeamsService,
  ) {}

  /**
   * Indexa as equipes do payload por número, recusando número fora da faixa,
   * número repetido e membro alocado em mais de uma equipe.
   */
  private indexByNumber(
    teams: TeamInputDto[] | undefined,
    teamsQuantity: number,
    { checkMemberUniqueness }: { checkMemberUniqueness: boolean },
  ): Map<number, TeamInputDto> {
    const byNumber = new Map<number, TeamInputDto>();
    const membersSeen = new Set<string>();

    for (const team of teams ?? []) {
      if (team.numberTeam < 1 || team.numberTeam > teamsQuantity) {
        throw new RuleException(
          SHELTER_MESSAGES.TEAM_OUT_OF_RANGE(team.numberTeam, teamsQuantity),
        );
      }
      if (byNumber.has(team.numberTeam)) {
        throw new RuleException(
          SHELTER_MESSAGES.TEAM_DUPLICATED(team.numberTeam),
        );
      }

      if (checkMemberUniqueness) {
        for (const memberId of team.memberProfileIds ?? []) {
          if (membersSeen.has(memberId)) {
            throw new RuleException(
              SHELTER_MESSAGES.MEMBER_IN_MULTIPLE_TEAMS(memberId),
            );
          }
          membersSeen.add(memberId);
        }
      }

      byNumber.set(team.numberTeam, team);
    }

    return byNumber;
  }

  /** Cria as equipes 1..N de um abrigo recém-criado. */
  async createForShelter(
    shelterId: string,
    teamsQuantity: number,
    teams: TeamInputDto[] | undefined,
  ): Promise<void> {
    const byNumber = this.indexByNumber(teams, teamsQuantity, {
      checkMemberUniqueness: true,
    });

    for (let numberTeam = 1; numberTeam <= teamsQuantity; numberTeam += 1) {
      await this.teamsService.create(
        this.toCreateDto(shelterId, numberTeam, byNumber.get(numberTeam)),
      );
    }
  }

  /**
   * Reconcilia as equipes com a nova quantidade: remove o excedente, atualiza
   * as que existem e cria as que faltam.
   */
  async syncForShelter(
    shelterId: string,
    teamsQuantity: number,
    teams: TeamInputDto[] | undefined,
    currentQuantity: number,
  ): Promise<void> {
    const byNumber = this.indexByNumber(teams, teamsQuantity, {
      checkMemberUniqueness: false,
    });

    const existing = await this.teamsService.findByShelter(shelterId);
    const existingByNumber = new Map(
      existing.map((team) => [team.numberTeam, team]),
    );

    for (
      let numberTeam = teamsQuantity + 1;
      numberTeam <= currentQuantity;
      numberTeam += 1
    ) {
      const team = existingByNumber.get(numberTeam);
      if (team) await this.teamsService.remove(team.id);
    }

    for (let numberTeam = 1; numberTeam <= teamsQuantity; numberTeam += 1) {
      const input = byNumber.get(numberTeam);
      const current = existingByNumber.get(numberTeam);

      if (current) {
        const updateDto: UpdateTeamDto = {
          description: input?.description,
          leaderProfileIds: input?.leaderProfileIds ?? [],
          memberProfileIds: input?.memberProfileIds ?? [],
        };
        await this.teamsService.update(current.id, updateDto);
        continue;
      }

      await this.teamsService.create(
        this.toCreateDto(shelterId, numberTeam, input),
      );
    }
  }

  private toCreateDto(
    shelterId: string,
    numberTeam: number,
    input: TeamInputDto | undefined,
  ): CreateTeamDto {
    return {
      numberTeam,
      description: input?.description,
      shelterId,
      leaderProfileIds: input?.leaderProfileIds,
      memberProfileIds: input?.memberProfileIds,
    };
  }
}
