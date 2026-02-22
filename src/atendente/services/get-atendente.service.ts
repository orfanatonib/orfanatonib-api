import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { MediaTargetType } from 'src/shared/media/media-target-type.enum';
import { IntegrationEntity } from 'src/shelter/integration/entities/integration.entity';
import { UserEntity } from 'src/core/user/entities/user.entity';
import { AtendenteRepository } from '../atendente.repository';
import { QueryAtendenteDto } from '../dto/query-atendente.dto';
import {
  AtendenteResponseDto,
  PaginatedAtendenteResponseDto,
} from '../dto/atendente-response.dto';
import { AttendableType } from '../entities/attendable-type.enum';

@Injectable()
export class GetAtendenteService {
  private readonly logger = new Logger(GetAtendenteService.name);

  constructor(
    private readonly atendenteRepo: AtendenteRepository,
    private readonly mediaProcessor: MediaItemProcessor,
    @InjectRepository(IntegrationEntity)
    private readonly integrationRepo: Repository<IntegrationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async findOne(id: string): Promise<AtendenteResponseDto> {
    const atendente = await this.atendenteRepo.findById(id);
    if (!atendente) {
      throw new NotFoundException(`Antecedente criminal with id ${id} not found.`);
    }
    const [pdfEstadual, pdfFederal, pdfLegacy] = await Promise.all([
      this.mediaProcessor.findMediaItemByTarget(id, MediaTargetType.AtendenteEstadual),
      this.mediaProcessor.findMediaItemByTarget(id, MediaTargetType.AtendenteFederal),
      this.mediaProcessor.findMediaItemByTarget(id, MediaTargetType.Atendente),
    ]);
    const displayName = await this.resolveAttendableDisplayName(
      atendente.attendableType,
      atendente.attendableId,
    );
    return AtendenteResponseDto.fromEntity(
      atendente,
      pdfEstadual ?? pdfLegacy,
      pdfFederal,
      displayName,
    );
  }

  async findAllPaginated(
    query: QueryAtendenteDto,
  ): Promise<PaginatedAtendenteResponseDto> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const normalizedQuery = { ...query, page, limit };
    const { data, total } = await this.atendenteRepo.findAllPaginated(normalizedQuery);
    const ids = data.map((a) => a.id);

    let estadualList: Awaited<ReturnType<MediaItemProcessor['findManyMediaItemsByTargets']>> = [];
    let federalList: Awaited<ReturnType<MediaItemProcessor['findManyMediaItemsByTargets']>> = [];
    let legacyList: Awaited<ReturnType<MediaItemProcessor['findManyMediaItemsByTargets']>> = [];
    if (ids.length > 0) {
      [estadualList, federalList, legacyList] = await Promise.all([
        this.mediaProcessor.findManyMediaItemsByTargets(ids, MediaTargetType.AtendenteEstadual),
        this.mediaProcessor.findManyMediaItemsByTargets(ids, MediaTargetType.AtendenteFederal),
        this.mediaProcessor.findManyMediaItemsByTargets(ids, MediaTargetType.Atendente),
      ]);
    }

    const mediaEstadualByTargetId = new Map(estadualList.map((m) => [m.targetId, m]));
    const mediaFederalByTargetId = new Map(federalList.map((m) => [m.targetId, m]));
    const mediaLegacyByTargetId = new Map(legacyList.map((m) => [m.targetId, m]));

    const integrationIds = data
      .filter((a) => a.attendableType === AttendableType.INTEGRATION && a.attendableId)
      .map((a) => a.attendableId!);
    const userIds = data
      .filter((a) => a.attendableType === AttendableType.USER && a.attendableId)
      .map((a) => a.attendableId!);

    let integrations: IntegrationEntity[] = [];
    let users: UserEntity[] = [];
    if (integrationIds.length > 0) {
      integrations = await this.integrationRepo.find({
        where: { id: In(integrationIds) },
      });
    }
    if (userIds.length > 0) {
      users = await this.userRepo.find({ where: { id: In(userIds) } });
    }
    const integrationMap = new Map(integrations.map((i) => [i.id, i.name]));
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const dtos = data.map((entity) => {
      const pdfEstadual = mediaEstadualByTargetId.get(entity.id) ?? mediaLegacyByTargetId.get(entity.id);
      const pdfFederal = mediaFederalByTargetId.get(entity.id);
      let displayName: string | undefined;
      if (entity.attendableType === AttendableType.INTEGRATION && entity.attendableId) {
        displayName = integrationMap.get(entity.attendableId);
      } else if (entity.attendableType === AttendableType.USER && entity.attendableId) {
        displayName = userMap.get(entity.attendableId);
      }
      return AtendenteResponseDto.fromEntity(
        entity,
        pdfEstadual ?? undefined,
        pdfFederal ?? undefined,
        displayName,
      );
    });

    return new PaginatedAtendenteResponseDto(dtos, total, page, limit);
  }

  private async resolveAttendableDisplayName(
    attendableType?: AttendableType | null,
    attendableId?: string | null,
  ): Promise<string | undefined> {
    if (!attendableType || !attendableId) return undefined;
    if (attendableType === AttendableType.INTEGRATION) {
      const integration = await this.integrationRepo.findOne({
        where: { id: attendableId },
      });
      return integration?.name ?? undefined;
    }
    if (attendableType === AttendableType.USER) {
      const user = await this.userRepo.findOne({ where: { id: attendableId } });
      return user?.name ?? undefined;
    }
    return undefined;
  }
}
