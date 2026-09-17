import {
  ForbiddenException,
  Injectable,
  forwardRef,
  Inject,
} from "@nestjs/common";
import { Request } from "express";
import { LeaderProfilesRepository } from "../repositories/leader-profiles.repository";
import { LeaderResponseDto } from "../dto/leader-profile.response.dto";
import { AuthContextService } from "src/core/auth/services/auth-context.service";
import { TeamsService } from "src/shelter/team/services/teams.service";
import {
  ManageLeaderTeamDto,
  ManageLeaderTeamsDto,
} from "../dto/assign-team.dto";
import { GetLeaderProfilesService } from "./get-leader-profiles.service";

type AccessCtx = { role?: string; userId?: string | null };

@Injectable()
export class UpdateLeaderProfileService {
  constructor(
    private readonly repo: LeaderProfilesRepository,
    private readonly authCtx: AuthContextService,
    private readonly getLeaderProfilesService: GetLeaderProfilesService,
    @Inject(forwardRef(() => TeamsService))
    private readonly teamsService: TeamsService,
  ) {}

  private async getCtx(req: Request): Promise<AccessCtx> {
    const payload = await this.authCtx.tryGetPayload(req);
    return {
      role: payload?.role?.toString().toLowerCase(),
      userId: payload?.sub ?? null,
    };
  }

  private assertAllowed(ctx: AccessCtx): void {
    if (!ctx.role || ctx.role === "member") {
      throw new ForbiddenException("Acesso negado");
    }
  }

  /**
   * Move líder exclusivamente para múltiplas equipes de múltiplos abrigos
   * Primeiro desvincula de todas as equipes, depois vincula às especificadas no payload
   */
  async manageTeams(
    leaderId: string,
    dto: ManageLeaderTeamsDto,
    req: Request,
  ): Promise<LeaderResponseDto> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    await this.repo.findOneWithSheltersAndMembersOrFail(leaderId);
    await this.teamsService.removeLeaderFromAllTeams(leaderId);

    for (const assignment of dto.assignments) {
      const shelterTeams = await this.teamsService.findByShelter(
        assignment.shelterId,
      );

      for (const teamNumber of assignment.teams) {
        const targetTeam = shelterTeams.find(
          (t) => t.numberTeam === teamNumber,
        );

        if (!targetTeam) {
          await this.teamsService.create({
            numberTeam: teamNumber,
            shelterId: assignment.shelterId,
            leaderProfileIds: [leaderId],
          });
        } else {
          await this.teamsService.addLeadersToTeam(targetTeam.id, [leaderId]);
        }
      }
    }

    return this.getLeaderProfilesService.findOne(leaderId, req);
  }

  /**
   * Move líder exclusivamente para uma equipe de um abrigo
   */
  async manageTeam(
    leaderId: string,
    dto: ManageLeaderTeamDto,
    req: Request,
  ): Promise<LeaderResponseDto> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const newDto: ManageLeaderTeamsDto = {
      assignments: [
        {
          shelterId: dto.shelterId,
          teams: [dto.numberTeam],
        },
      ],
    };

    return this.manageTeams(leaderId, newDto, req);
  }
}
