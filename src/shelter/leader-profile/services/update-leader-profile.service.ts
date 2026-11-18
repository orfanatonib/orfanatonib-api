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
import { GetTeamsService } from "src/shelter/team/services/get-teams.service";
import { CreateTeamService } from "src/shelter/team/services/create-team.service";
import { UpdateTeamService } from "src/shelter/team/services/update-team.service";
import { DeleteTeamService } from "src/shelter/team/services/delete-team.service";
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
    @Inject(forwardRef(() => GetTeamsService))
    private readonly getTeamsService: GetTeamsService,
    @Inject(forwardRef(() => CreateTeamService))
    private readonly createTeamService: CreateTeamService,
    @Inject(forwardRef(() => UpdateTeamService))
    private readonly updateTeamService: UpdateTeamService,
    @Inject(forwardRef(() => DeleteTeamService))
    private readonly deleteTeamService: DeleteTeamService,
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
   * Admin gerencia qualquer líder. Líder só mexe em quem está (e só aloca em)
   * abrigos que ele mesmo lidera: senão poderia tirar/pôr gente em equipe alheia.
   */
  private async assertLeaderScope(
    ctx: AccessCtx,
    target: {
      teams?: Array<{ shelter?: { id: string } | null }> | null;
    },
    dto: ManageLeaderTeamsDto,
  ): Promise<void> {
    if (ctx.role === "admin") return;
    const led = ctx.userId
      ? await this.getTeamsService.findLedShelterIds(ctx.userId)
      : new Set<string>();
    const touched = [
      ...(target.teams ?? []).flatMap((team) =>
        team.shelter ? [team.shelter.id] : [],
      ),
      ...dto.assignments.map((assignment) => assignment.shelterId),
    ];
    if (touched.some((shelterId) => !led.has(shelterId))) {
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

    const target =
      await this.repo.findOneWithSheltersAndMembersOrFail(leaderId);
    await this.assertLeaderScope(ctx, target, dto);
    await this.deleteTeamService.removeLeaderFromAllTeams(leaderId);

    for (const assignment of dto.assignments) {
      const shelterTeams = await this.getTeamsService.findByShelter(
        assignment.shelterId,
      );

      for (const teamNumber of assignment.teams) {
        const targetTeam = shelterTeams.find(
          (t) => t.numberTeam === teamNumber,
        );

        if (!targetTeam) {
          await this.createTeamService.execute({
            numberTeam: teamNumber,
            shelterId: assignment.shelterId,
            leaderProfileIds: [leaderId],
          });
        } else {
          await this.updateTeamService.addLeadersToTeam(targetTeam.id, [
            leaderId,
          ]);
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
