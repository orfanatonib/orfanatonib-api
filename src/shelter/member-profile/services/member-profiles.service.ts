import { ForbiddenException, Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { Request } from 'express';

import { MemberProfilesRepository } from '../repositories/member-profiles.repository';
import {
  MemberResponseDto,
  toMemberDto,
} from '../dto/member-profile.response.dto';
import { MemberSimpleListDto } from '../dto/member-simple-list.dto';
import { AuthContextService } from 'src/core/auth/services/auth-context.service';
import { PageDto, MemberProfilesQueryDto } from '../dto/member-profiles.query.dto';
import { TeamsService } from 'src/shelter/team/services/teams.service';
import { ManageMemberTeamDto } from '../dto/assign-team.dto';

type AccessCtx = { role?: string; userId?: string | null };

@Injectable()
export class MemberProfilesService {
  constructor(
    private readonly repo: MemberProfilesRepository,
    private readonly authCtx: AuthContextService,
    @Inject(forwardRef(() => TeamsService))
    private readonly teamsService: TeamsService,
  ) { }

  private async getCtx(req: Request): Promise<AccessCtx> {
    const payload = await this.authCtx.tryGetPayload(req);
    return {
      role: payload?.role?.toString().toLowerCase(),
      userId: payload?.sub ?? null,
    };
  }
  async findPage(
    req: Request,
    query: MemberProfilesQueryDto,
  ): Promise<PageDto<MemberResponseDto>> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const { items, total, page, limit } = await this.repo.findPageWithFilters(query, ctx);
    return {
      items: items.map(toMemberDto),
      total,
      page,
      limit,
    };
  }
  private assertAllowed(ctx: AccessCtx) {
    if (!ctx.role) throw new ForbiddenException('Acesso negado');
    if (ctx.role === 'member') throw new ForbiddenException('Acesso negado');
  }

  async list(req: Request): Promise<MemberSimpleListDto[]> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    return await this.repo.list(ctx);
  }

  async findOne(id: string, req: Request): Promise<MemberResponseDto> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const member = await this.repo.findOneWithShelterAndLeaderOrFail(id, ctx);
    return toMemberDto(member);
  }

  async createForUser(userId: string) {
    return this.repo.createForUser(userId);
  }

  async removeByUserId(userId: string) {
    return this.repo.removeByUserId(userId);
  }

  async manageTeam(memberId: string, dto: ManageMemberTeamDto, req: Request): Promise<MemberResponseDto> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const member = await this.repo.findOneWithShelterAndLeaderOrFail(memberId, ctx);

    const teams = await this.teamsService.findByShelter(dto.shelterId);

    let targetTeam = teams.find(t => t.numberTeam === dto.numberTeam);

    if (!targetTeam) {
      const newTeam = await this.teamsService.create({
        numberTeam: dto.numberTeam,
        shelterId: dto.shelterId,
        memberProfileIds: [memberId],
      });
      targetTeam = newTeam;
    } else {
      if (member.team && member.team.id !== targetTeam.id) {
        const currentTeam = await this.teamsService.findOne(member.team.id);
        if (currentTeam) {
          const currentMemberIds = currentTeam.members.map(t => t.id).filter(id => id !== memberId);
          await this.teamsService.update(currentTeam.id, {
            memberProfileIds: currentMemberIds,
          });
        }
      }

      if (!member.team || member.team.id !== targetTeam.id) {
        const currentMemberIds = targetTeam.members.map(t => t.id).filter(id => id !== memberId);
        await this.teamsService.update(targetTeam.id, {
          memberProfileIds: [...currentMemberIds, memberId],
        });
      }
    }

    return this.findOne(memberId, req);
  }
}
