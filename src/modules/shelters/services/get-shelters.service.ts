import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { SheltersRepository } from '../repositories/shelters.repository';
import { QuerySheltersDto } from '../dto/query-shelters.dto';
import {
  ShelterResponseDto,
  ShelterSimpleResponseDto,
  toShelterDto,
  toShelterSimpleDto,
} from '../dto/shelter.response.dto';
import { Paginated } from 'src/share/dto/paginated.dto';
import { ShelterSelectOptionDto } from '../dto/shelter-select-option.dto';
import { AuthContextService } from 'src/auth/services/auth-context.service';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { ShelterEntity } from '../entities/shelter.entity/shelter.entity';
import { ShelterTeamsQuantityResponseDto } from '../dto/shelter-teams-quantity-response.dto';

type Ctx = { role?: string; userId?: string | null };

@Injectable()
export class GetSheltersService {
  constructor(
    private readonly sheltersRepository: SheltersRepository,
    private readonly authCtx: AuthContextService,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  private async getCtx(req: Request): Promise<Ctx> {
    const p = await this.authCtx.tryGetPayload(req);
    return { role: p?.role?.toLowerCase(), userId: p?.sub ?? null };
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

  private async populateUserMediaItemsForShelter(shelter: ShelterEntity): Promise<void> {
    const teams: any[] = Array.isArray((shelter as any).teams) ? (shelter as any).teams : [];
    if (!teams.length) return;

    const userIdsSet = new Set<string>();

    teams.forEach((team: any) => {
      const leaders = Array.isArray(team?.leaders) ? team.leaders : [];
      const teachers = Array.isArray(team?.teachers) ? team.teachers : [];

      leaders.forEach((leader: any) => {
        const userId = leader?.user?.id;
        if (typeof userId === 'string' && userId) userIdsSet.add(userId);
      });

      teachers.forEach((teacher: any) => {
        const userId = teacher?.user?.id;
        if (typeof userId === 'string' && userId) userIdsSet.add(userId);
      });
    });

    const userIds = Array.from(userIdsSet);
    if (!userIds.length) return;

    const mediaItems = await this.mediaItemProcessor.findManyMediaItemsByTargets(
      userIds,
      'UserEntity',
    );

    const mediaMap = new Map<string, any>();
    mediaItems.forEach((item: any) => {
      const prev = mediaMap.get(item.targetId);
      if (!prev) {
        mediaMap.set(item.targetId, item);
        return;
      }
      const prevTs = prev?.createdAt ? new Date(prev.createdAt).getTime() : 0;
      const curTs = item?.createdAt ? new Date(item.createdAt).getTime() : 0;
      if (curTs >= prevTs) {
        mediaMap.set(item.targetId, item);
      }
    });

    teams.forEach((team: any) => {
      const leaders = Array.isArray(team?.leaders) ? team.leaders : [];
      const teachers = Array.isArray(team?.teachers) ? team.teachers : [];

      leaders.forEach((leader: any) => {
        const userId = leader?.user?.id;
        if (!leader?.user || typeof userId !== 'string') return;
        leader.user.mediaItem = mediaMap.get(userId) || null;
      });

      teachers.forEach((teacher: any) => {
        const userId = teacher?.user?.id;
        if (!teacher?.user || typeof userId !== 'string') return;
        teacher.user.mediaItem = mediaMap.get(userId) || null;
      });
    });
  }

  async findAllPaginated(q: QuerySheltersDto, req: Request): Promise<Paginated<ShelterResponseDto>> {
    const ctx = await this.getCtx(req);
    if (!ctx.role || ctx.role === 'teacher') throw new ForbiddenException('Acesso negado');

    const { page = 1, limit = 10 } = q;
    const { items, total } = await this.sheltersRepository.findAllPaginated(q, ctx);

    const itemsWithMedia = await this.populateMediaItems(items);

    return new Paginated(itemsWithMedia.map(toShelterDto), total, page, limit);
  }

  async findAllSimple(req: Request): Promise<ShelterSimpleResponseDto[]> {
    const ctx = await this.getCtx(req);
    const shelters = await this.sheltersRepository.findAllSimple(ctx);

    const sheltersWithMedia = await this.populateMediaItems(shelters);
    
    return sheltersWithMedia.map(toShelterSimpleDto);
  }

  async findOne(id: string, req: Request): Promise<ShelterResponseDto> {
    const ctx = await this.getCtx(req);
    const shelter = await this.sheltersRepository.findOneOrFailForResponse(id, ctx);
    if (!shelter) throw new NotFoundException('Shelter not found');

    await this.populateMediaItems([shelter]);

    await this.populateUserMediaItemsForShelter(shelter);
    
    return toShelterDto(shelter);
  }

  async list(req: Request): Promise<ShelterSelectOptionDto[]> {
    const ctx = await this.getCtx(req);
    return await this.sheltersRepository.list(ctx);
  }

  async getTeamsQuantity(id: string, req: Request): Promise<ShelterTeamsQuantityResponseDto> {
    const ctx = await this.getCtx(req);
    const shelter = await this.sheltersRepository.findOneOrFailForResponse(id, ctx);
    if (!shelter) throw new NotFoundException('Shelter not found');
    
    return {
      id: shelter.id,
      teamsQuantity: shelter.teamsQuantity ?? 0,
    };
  }
}