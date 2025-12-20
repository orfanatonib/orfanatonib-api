import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Request } from 'express';

import { ShelteredRepository } from './repositories/sheltered.repository';
import { AddressesService } from '../addresses/addresses.service';
import { GetSheltersService } from '../shelters/services/get-shelters.service';

import { CreateShelteredDto } from './dto/create-sheltered.dto';
import { UpdateShelteredDto } from './dto/update-sheltered.dto';
import { QueryShelteredDto, QueryShelteredSimpleDto } from './dto/query-sheltered.dto';
import {
  PaginatedResponseDto,
  ShelteredResponseDto,
  ShelteredListItemDto,
} from './dto/sheltered-response.dto';
import { toShelteredListItemDto, toShelteredResponseDto } from './mappers/sheltered.mapper';
import { ShelterEntity } from '../shelters/entities/shelter.entity/shelter.entity';
import { AuthContextService } from 'src/auth/services/auth-context.service';

const toDateOnlyStr = (v: string | Date | undefined | null): string | null => {
  if (v === undefined || v === null) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (m) return m[1];
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

type AccessCtx = { role?: string; userId?: string | null };

@Injectable()
export class ShelteredService {
  constructor(
    private readonly shelteredRepo: ShelteredRepository,
    private readonly addressesService: AddressesService,
    private readonly getSheltersService: GetSheltersService,
    private readonly authContextService: AuthContextService,
  ) { }

  private validateGender(gender: string): void {
    if (gender && !['M', 'F'].includes(gender.toUpperCase())) {
      throw new BadRequestException('Gender deve ser "M" ou "F"');
    }
  }

  private async getCtx(request: Request): Promise<AccessCtx> {
    const payload = await this.authContextService.tryGetPayload(request);
    return {
      role: payload?.role?.toString().toLowerCase(),
      userId: payload?.sub ?? null,
    };
  }

  async findAll(
    query: QueryShelteredDto,
    request: Request,
  ): Promise<PaginatedResponseDto<ShelteredResponseDto>> {
    const ctx = await this.getCtx(request);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { items, total } = await this.shelteredRepo.findAllPaginated(query, ctx);

    return {
      data: items.map(toShelteredResponseDto),
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        orderBy: query.orderBy ?? 'name',
        order: (query.order ?? 'ASC').toUpperCase() as any,
      },
    };
  }

  async findAllSimples(
    query: QueryShelteredSimpleDto,
    request: Request,
  ): Promise<PaginatedResponseDto<ShelteredListItemDto>> {
    const ctx = await this.getCtx(request);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { items, total } = await this.shelteredRepo.findAllSimple(
      {
        page,
        limit,
        searchString: query.searchString,
        acceptedJesus: query.acceptedJesus,
        active: query.active,
      },
      ctx,
    );

    return {
      data: items.map(toShelteredListItemDto),
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, request: Request): Promise<ShelteredResponseDto> {
    const ctx = await this.getCtx(request);
    const entity = await this.shelteredRepo.findOneForResponse(id, ctx);
    if (!entity) throw new NotFoundException('Sheltered not found or no access');
    return toShelteredResponseDto(entity);
  }

  async create(dto: CreateShelteredDto, request: Request): Promise<ShelteredResponseDto> {
    const ctx = await this.getCtx(request);

    // Validar gender
    this.validateGender(dto.gender);

    if (ctx.role && ctx.role !== 'admin' && dto.shelterId) {
      const allowed = await this.shelteredRepo.userHasAccessToShelter(dto.shelterId, ctx);
      if (!allowed) throw new ForbiddenException('Sem acesso ao shelter informado');
    }

    const sheltered = this.shelteredRepo.create({
      name: dto.name,
      guardianName: dto.guardianName,
      gender: dto.gender,
      guardianPhone: dto.guardianPhone,
      birthDate: toDateOnlyStr(dto.birthDate) as any,
      joinedAt: toDateOnlyStr(dto.joinedAt) as any,
    });

    if (dto.shelterId) {
      await this.getSheltersService.findOne(dto.shelterId, request);
      (sheltered as any).shelter = { id: dto.shelterId } as ShelterEntity;
    }

    if (dto.address) {
      const address = await this.addressesService.create(dto.address);
      (sheltered as any).address = address;
    }

    const saved = await this.shelteredRepo.save(sheltered);
    const withRels = await this.shelteredRepo.findOneForResponse(saved.id, ctx);
    return toShelteredResponseDto(withRels!);
  }

  async update(id: string, dto: UpdateShelteredDto, request: Request): Promise<ShelteredResponseDto> {
    const ctx = await this.getCtx(request);

    // Validar gender se fornecido
    if (dto.gender !== undefined) {
      this.validateGender(dto.gender);
    }

    const entity = await this.shelteredRepo.findOneForResponse(id, ctx);
    if (!entity) throw new NotFoundException('Sheltered not found or no access');

    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.guardianName !== undefined) entity.guardianName = dto.guardianName;
    if (dto.gender !== undefined) entity.gender = dto.gender;
    if (dto.guardianPhone !== undefined) entity.guardianPhone = dto.guardianPhone;
    if (dto.birthDate !== undefined) entity.birthDate = toDateOnlyStr(dto.birthDate) as any;
    if (dto.joinedAt !== undefined) entity.joinedAt = toDateOnlyStr(dto.joinedAt) as any;
    if (dto.active !== undefined) entity.active = dto.active;

    if (dto.shelterId !== undefined) {
      if (dto.shelterId === null) {
        (entity as any).shelter = null;
      } else {
        await this.getSheltersService.findOne(dto.shelterId, request);
        if (ctx.role && ctx.role !== 'admin') {
          const allowed = await this.shelteredRepo.userHasAccessToShelter(dto.shelterId, ctx);
          if (!allowed) throw new ForbiddenException('Sem acesso ao novo shelter');
        }
        (entity as any).shelter = { id: dto.shelterId } as ShelterEntity;
      }
    }

    if (dto.address !== undefined) {
      if (dto.address === null) {
        (entity as any).address = null;
      } else {
        if (entity.address) {
          await this.addressesService.update(entity.address.id, dto.address);
        } else {
          const address = await this.addressesService.create(dto.address);
          (entity as any).address = address;
        }
      }
    }

    await this.shelteredRepo.save(entity);
    const reloaded = await this.shelteredRepo.findOneForResponse(id, ctx);
    return toShelteredResponseDto(reloaded!);
  }

  async updateStatus(id: string, active: boolean, request: Request): Promise<ShelteredResponseDto> {
    const ctx = await this.getCtx(request);
    const entity = await this.shelteredRepo.findOneForResponse(id, ctx);
    if (!entity) throw new NotFoundException('Sheltered not found or no access');
    
    entity.active = active;
    await this.shelteredRepo.save(entity);
    
    const reloaded = await this.shelteredRepo.findOneForResponse(id, ctx);
    return toShelteredResponseDto(reloaded!);
  }

  async remove(id: string, request: Request): Promise<void> {
    const ctx = await this.getCtx(request);
    const entity = await this.shelteredRepo.findOneForResponse(id, ctx);
    if (!entity) throw new NotFoundException('Sheltered not found or no access');
    await this.shelteredRepo.delete(id);
  }
}
