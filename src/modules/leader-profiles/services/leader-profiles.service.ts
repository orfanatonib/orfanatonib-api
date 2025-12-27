import { ForbiddenException, Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { Request } from 'express';
import { LeaderProfilesRepository } from '../repositories/leader-profiles.repository';
import {
  LeaderResponseDto,
  toLeaderDto,
} from '../dto/leader-profile.response.dto';
import { LeaderSimpleListDto } from '../dto/leader-simple-list.dto';
import { LeaderProfilesQueryDto, PageDto } from '../dto/leader-profiles.query.dto';
import { AuthContextService } from 'src/auth/services/auth-context.service';
import { TeamsService } from 'src/modules/teams/services/teams.service';
import { ManageLeaderTeamDto, ManageLeaderTeamsDto } from '../dto/assign-team.dto';
import { SheltersRepository } from 'src/modules/shelters/repositories/shelters.repository';
import { ShelterSimpleResponseDto, ShelterWithLeaderStatusDto, toShelterSimpleDto, toShelterWithLeaderStatusDto } from 'src/modules/shelters/dto/shelter.response.dto';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { ShelterEntity } from 'src/modules/shelters/entities/shelter.entity/shelter.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

type AccessCtx = { role?: string; userId?: string | null };

@Injectable()
export class LeaderProfilesService {
  constructor(
    private readonly repo: LeaderProfilesRepository,
    private readonly authCtx: AuthContextService,
    @Inject(forwardRef(() => TeamsService))
    private readonly teamsService: TeamsService,
    @Inject(forwardRef(() => SheltersRepository))
    private readonly sheltersRepository: SheltersRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    @InjectRepository(ShelterEntity)
    private readonly shelterRepo: Repository<ShelterEntity>,
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
    query: LeaderProfilesQueryDto,
  ): Promise<PageDto<LeaderResponseDto>> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const { items, total, page, limit } = await this.repo.findPageWithFilters(query);
    return {
      items: items.map(toLeaderDto),
      total,
      page,
      limit,
    };
  }

  private assertAllowed(ctx: AccessCtx) {
    if (!ctx.role) throw new ForbiddenException('Acesso negado');
    if (ctx.role === 'teacher') throw new ForbiddenException('Acesso negado');
  }

  async list(req: Request): Promise<LeaderSimpleListDto[]> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    return await this.repo.list();
  }

  async findOne(id: string, req: Request): Promise<LeaderResponseDto> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const leader = await this.repo.findOneWithSheltersAndTeachersOrFail(id);
    return toLeaderDto(leader);
  }

  async createForUser(userId: string) {
    return this.repo.createForUser(userId);
  }

  async removeByUserId(userId: string) {
    return this.repo.removeByUserId(userId);
  }

  /**
   * Move líder exclusivamente para múltiplas equipes de múltiplos abrigos
   * Primeiro desvincula de todas as equipes, depois vincula às especificadas no payload
   */
  async manageTeams(leaderId: string, dto: ManageLeaderTeamsDto, req: Request): Promise<LeaderResponseDto> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const leader = await this.repo.findOneWithSheltersAndTeachersOrFail(leaderId);

    await this.teamsService.removeLeaderFromAllTeams(leaderId);

    for (const assignment of dto.assignments) {
      const shelterTeams = await this.teamsService.findByShelter(assignment.shelterId);

      for (const teamNumber of assignment.teams) {
        let targetTeam = shelterTeams.find(t => t.numberTeam === teamNumber);

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

    return this.findOne(leaderId, req);
  }

  /**
   * Move líder exclusivamente para uma equipe de um abrigo (mantido para compatibilidade)
   * Remove o líder de todas as equipes atuais antes de vincular à nova equipe
   */
  async manageTeam(leaderId: string, dto: ManageLeaderTeamDto, req: Request): Promise<LeaderResponseDto> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const newDto: ManageLeaderTeamsDto = {
      assignments: [{
        shelterId: dto.shelterId,
        teams: [dto.numberTeam]
      }]
    };

    return this.manageTeams(leaderId, newDto, req);
  }

  /**
   * Busca todos os abrigos do líder logado
   * Retorna todas as equipes de cada abrigo, indicando em quais o líder está inserido
   */
  async findMyShelters(req: Request): Promise<ShelterWithLeaderStatusDto[]> {
    const ctx = await this.getCtx(req);
    
    if (!ctx.role || ctx.role !== 'leader' || !ctx.userId) {
      throw new ForbiddenException('Only leaders can access their shelters');
    }

    const leader = await this.repo.findByUserId(ctx.userId);

    if (!leader) {
      throw new NotFoundException('Leader profile not found');
    }

    const shelterIds = await this.sheltersRepository.findShelterIdsForLeader(ctx.userId);
    
    if (shelterIds.length === 0) {
      return [];
    }

    const shelters = await this.shelterRepo.find({
      where: { id: In(shelterIds) },
      relations: ['address', 'teams', 'teams.leaders', 'teams.leaders.user', 'teams.teachers', 'teams.teachers.user'],
      order: {
        name: 'ASC',
        teams: {
          numberTeam: 'ASC',
        },
      },
    });

    const sheltersWithMedia = await this.populateMediaItems(shelters);
    
    return sheltersWithMedia.map(shelter => toShelterWithLeaderStatusDto(shelter, leader.id));
  }

  private async populateMediaItems(shelters: ShelterEntity[]): Promise<ShelterEntity[]> {
    if (!shelters.length) return shelters;

    const shelterIds = shelters.map(s => s.id);
    const mediaItems = await this.mediaItemProcessor.findManyMediaItemsByTargets(
      shelterIds,
      'ShelterEntity'
    );

    const mediaMap = new Map();
    mediaItems.forEach(item => {
      if (!mediaMap.has(item.targetId)) {
        mediaMap.set(item.targetId, item);
      }
    });

    shelters.forEach(shelter => {
      (shelter as any).mediaItem = mediaMap.get(shelter.id) || null;
    });

    return shelters;
  }
}
