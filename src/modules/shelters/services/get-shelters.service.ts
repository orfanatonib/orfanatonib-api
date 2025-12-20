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

  async findAllPaginated(q: QuerySheltersDto, req: Request): Promise<Paginated<ShelterResponseDto>> {
    const ctx = await this.getCtx(req);
    if (!ctx.role || ctx.role === 'teacher') throw new ForbiddenException('Acesso negado');

    const { page = 1, limit = 10 } = q;
    const { items, total } = await this.sheltersRepository.findAllPaginated(q, ctx);

    // Popular media items
    const itemsWithMedia = await this.populateMediaItems(items);

    return new Paginated(itemsWithMedia.map(toShelterDto), total, page, limit);
  }

  async findAllSimple(req: Request): Promise<ShelterSimpleResponseDto[]> {
    const ctx = await this.getCtx(req);
    const shelters = await this.sheltersRepository.findAllSimple(ctx);
    
    // Popular media items
    const sheltersWithMedia = await this.populateMediaItems(shelters);
    
    return sheltersWithMedia.map(toShelterSimpleDto);
  }

  async findOne(id: string, req: Request): Promise<ShelterResponseDto> {
    const ctx = await this.getCtx(req);
    const shelter = await this.sheltersRepository.findOneOrFailForResponse(id, ctx);
    if (!shelter) throw new NotFoundException('Shelter not found');
    
    // Popular media item
    await this.populateMediaItems([shelter]);
    
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