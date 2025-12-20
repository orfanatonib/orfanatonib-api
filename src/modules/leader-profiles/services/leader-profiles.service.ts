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
import { ManageLeaderTeamDto } from '../dto/assign-team.dto';
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

    console.log("Buscando página com filtros:", query);
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
   * Vincula líder a uma equipe de um abrigo
   * Agora um líder pode estar em múltiplas equipes (do mesmo ou de diferentes abrigos)
   */
  async manageTeam(leaderId: string, dto: ManageLeaderTeamDto, req: Request): Promise<LeaderResponseDto> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const leader = await this.repo.findOneWithSheltersAndTeachersOrFail(leaderId);

    // Buscar equipes do abrigo
    const teams = await this.teamsService.findByShelter(dto.shelterId);

    let targetTeam = teams.find(t => t.numberTeam === dto.numberTeam);

    if (!targetTeam) {
      // Criar nova equipe
      const newTeam = await this.teamsService.create({
        numberTeam: dto.numberTeam,
        shelterId: dto.shelterId,
        leaderProfileIds: [leaderId],
      });
      targetTeam = newTeam;
    } else {
      const isAlreadyInTeam = targetTeam.leaders.some(l => l.id === leaderId);
      
      if (!isAlreadyInTeam) {
        const currentLeaderIds = targetTeam.leaders.map(l => l.id);
        await this.teamsService.update(targetTeam.id, {
          leaderProfileIds: [...currentLeaderIds, leaderId],
        });
      }
    }

    return this.findOne(leaderId, req);
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

    // Buscar todos os abrigos por IDs, com todas as equipes (sem filtro de role nas equipes)
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
    
    // Popular media items
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

    // Criar mapa de media items por shelterId (apenas o primeiro de cada)
    const mediaMap = new Map();
    mediaItems.forEach(item => {
      if (!mediaMap.has(item.targetId)) {
        mediaMap.set(item.targetId, item);
      }
    });

    // Popular o mediaItem em cada shelter
    shelters.forEach(shelter => {
      (shelter as any).mediaItem = mediaMap.get(shelter.id) || null;
    });

    return shelters;
  }
}
