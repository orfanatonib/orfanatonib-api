import {
  ForbiddenException,
  Injectable,
  forwardRef,
  Inject,
} from "@nestjs/common";
import { Request } from "express";
import { MemberProfilesRepository } from "../repositories/member-profiles.repository";
import { MemberResponseDto } from "../dto/member-profile.response.dto";
import { AuthContextService } from "src/core/auth/services/auth-context.service";
import { GetTeamsService } from "src/shelter/team/services/get-teams.service";
import { UpdateTeamService } from "src/shelter/team/services/update-team.service";
import { ManageMemberTeamDto } from "../dto/assign-team.dto";
import { NotificationService } from "src/communication/notification/services/notification.service";
import { GetMemberProfilesService } from "./get-member-profiles.service";

type AccessCtx = { role?: string; userId?: string | null };

@Injectable()
export class UpdateMemberProfileService {
  constructor(
    private readonly repo: MemberProfilesRepository,
    private readonly authCtx: AuthContextService,
    private readonly getMemberProfilesService: GetMemberProfilesService,
    @Inject(forwardRef(() => GetTeamsService))
    private readonly getTeamsService: GetTeamsService,
    @Inject(forwardRef(() => UpdateTeamService))
    private readonly updateTeamService: UpdateTeamService,
    private readonly notificationService: NotificationService,
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

  async assignTeamForUser(userId: string, teamId: string): Promise<void> {
    await this.repo.assignTeamByIdForUser(userId, teamId);
  }

  private async notifyTeamAssignment(member: MemberResponseDto): Promise<void> {
    const email = member.user?.email;
    const shelter = member.shelter;
    if (!email || !shelter?.team) return;

    try {
      await this.notificationService.sendTeamAssignmentChanged(email, {
        userName: member.user.name,
        shelterName: shelter.name,
        teamNumber: shelter.team.numberTeam,
        assigned: true,
      });
    } catch {
      // Avisar não pode desfazer o vínculo que acabou de ser gravado.
    }
  }

  async manageTeam(
    memberId: string,
    dto: ManageMemberTeamDto,
    req: Request,
  ): Promise<MemberResponseDto> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    // Fora do escopo (ou inexistente) é 404, antes de qualquer alteração.
    await this.repo.findOneWithShelterAndLeaderOrFail(memberId, ctx);

    // Líder só aloca membro em abrigo que ele mesmo lidera.
    if (ctx.role !== "admin") {
      const led = ctx.userId
        ? await this.getTeamsService.findLedShelterIds(ctx.userId)
        : new Set<string>();
      if (!led.has(dto.shelterId)) {
        throw new ForbiddenException("Acesso negado");
      }
    }

    // Uma operação só: tira da equipe antiga e põe na nova sem deixar o membro sem equipe se algo falhar.
    const { changed } = await this.updateTeamService.assignMemberToTeam(
      memberId,
      dto.shelterId,
      dto.numberTeam,
    );

    const updated = await this.getMemberProfilesService.findOne(memberId, req);
    // Só avisa quando a equipe mudou de fato (repetir o pedido não reenvia o e-mail).
    if (changed) await this.notifyTeamAssignment(updated);
    return updated;
  }
}
