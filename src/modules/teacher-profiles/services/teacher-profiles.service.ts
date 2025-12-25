import { ForbiddenException, Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { Request } from 'express';

import { TeacherProfilesRepository } from '../repositories/teacher-profiles.repository';
import {
  TeacherResponseDto,
  toTeacherDto,
} from '../dto/teacher-profile.response.dto';
import { TeacherSimpleListDto } from '../dto/teacher-simple-list.dto';
import { AuthContextService } from 'src/auth/services/auth-context.service';
import { PageDto, TeacherProfilesQueryDto } from '../dto/teacher-profiles.query.dto';
import { TeamsService } from 'src/modules/teams/services/teams.service';
import { ManageTeacherTeamDto } from '../dto/assign-team.dto';

type AccessCtx = { role?: string; userId?: string | null };

@Injectable()
export class TeacherProfilesService {
  constructor(
    private readonly repo: TeacherProfilesRepository,
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
    query: TeacherProfilesQueryDto,
  ): Promise<PageDto<TeacherResponseDto>> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const { items, total, page, limit } = await this.repo.findPageWithFilters(query, ctx);
    return {
      items: items.map(toTeacherDto),
      total,
      page,
      limit,
    };
  }
  private assertAllowed(ctx: AccessCtx) {
    if (!ctx.role) throw new ForbiddenException('Acesso negado');
    if (ctx.role === 'teacher') throw new ForbiddenException('Acesso negado');
  }

  async list(req: Request): Promise<TeacherSimpleListDto[]> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    return await this.repo.list(ctx);
  }

  async findOne(id: string, req: Request): Promise<TeacherResponseDto> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const teacher = await this.repo.findOneWithShelterAndLeaderOrFail(id, ctx);
    return toTeacherDto(teacher);
  }

  async createForUser(userId: string) {
    return this.repo.createForUser(userId);
  }

  async removeByUserId(userId: string) {
    return this.repo.removeByUserId(userId);
  }

  /**
   * Vincula professor a uma equipe de um abrigo
   * Se já estiver vinculado a outra equipe, move para a nova
   */
  async manageTeam(teacherId: string, dto: ManageTeacherTeamDto, req: Request): Promise<TeacherResponseDto> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    // Buscar o professor
    const teacher = await this.repo.findOneWithShelterAndLeaderOrFail(teacherId, ctx);

    // Buscar equipes do abrigo
    const teams = await this.teamsService.findByShelter(dto.shelterId);

    let targetTeam = teams.find(t => t.numberTeam === dto.numberTeam);

    if (!targetTeam) {
      // Criar nova equipe
      const newTeam = await this.teamsService.create({
        numberTeam: dto.numberTeam,
        shelterId: dto.shelterId,
        teacherProfileIds: [teacherId],
      });
      targetTeam = newTeam;
    } else {
      if (teacher.team && teacher.team.id !== targetTeam.id) {
        const currentTeam = await this.teamsService.findOne(teacher.team.id);
        if (currentTeam) {
          const currentTeacherIds = currentTeam.teachers.map(t => t.id).filter(id => id !== teacherId);
          await this.teamsService.update(currentTeam.id, {
            teacherProfileIds: currentTeacherIds,
          });
        }
      }

      if (!teacher.team || teacher.team.id !== targetTeam.id) {
        const currentTeacherIds = targetTeam.teachers.map(t => t.id).filter(id => id !== teacherId);
        await this.teamsService.update(targetTeam.id, {
          teacherProfileIds: [...currentTeacherIds, teacherId],
        });
      }
    }

    return this.findOne(teacherId, req);
  }
}
