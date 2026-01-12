import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Request } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SheltersRepository } from '../repositories/shelters.repository';
import { UpdateShelterDto } from '../dto/update-shelter.dto';
import { ShelterEntity } from '../entities/shelter.entity/shelter.entity';

import { AuthContextService } from 'src/core/auth/services/auth-context.service';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';
import { MediaType, UploadType } from 'src/shared/media/media-item/media-item.entity';

import { RouteService } from 'src/infrastructure/route/route.service';
import { RouteEntity, RouteType } from 'src/infrastructure/route/route-page.entity';

import { GetSheltersService } from './get-shelters.service';

import { TeamsService } from 'src/shelter/team/services/teams.service';
import { CreateTeamDto } from 'src/shelter/team/dto/create-team.dto';
import { UpdateTeamDto } from 'src/shelter/team/dto/update-team.dto';

type Ctx = { role?: string; userId?: string | null };

@Injectable()
export class UpdateSheltersService {
  private readonly logger = new Logger(UpdateSheltersService.name);


  private readonly ROUTE_PREFIX = 'abrigo_';

  constructor(
    private readonly sheltersRepository: SheltersRepository,
    private readonly authCtx: AuthContextService,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly s3Service: AwsS3Service,
    private readonly routeService: RouteService,
    @Inject(forwardRef(() => GetSheltersService))
    private readonly getService: GetSheltersService,
    @Inject(forwardRef(() => TeamsService))
    private readonly teamsService: TeamsService,
  ) { }


  private async getCtx(req: Request): Promise<Ctx> {
    const p = await this.authCtx.tryGetPayload(req);
    return { role: p?.role?.toLowerCase(), userId: p?.sub ?? null };
  }

  private parseBody(body: any): UpdateShelterDto {
    const payload =
      body?.shelterData != null
        ? typeof body.shelterData === 'string'
          ? JSON.parse(body.shelterData)
          : body.shelterData
        : body;

    return plainToInstance(UpdateShelterDto, payload);
  }

  private async validateDto(dto: UpdateShelterDto): Promise<void> {
    const errors = await validate(dto);
    if (errors.length > 0) throw new BadRequestException(errors);
  }

  private mapFiles(files: Express.Multer.File[] = []): Record<string, Express.Multer.File> {
    const dict: Record<string, Express.Multer.File> = {};
    for (const f of files) dict[f.fieldname] = f;
    return dict;
  }

  private parseMediaBody(body: any): {
    title?: string;
    description?: string;
    uploadType?: UploadType;
    url?: string;
    isLocalFile?: boolean;
  } {
    if (body?.mediaData) {
      return typeof body.mediaData === 'string' ? JSON.parse(body.mediaData) : body.mediaData;
    }

    if (body?.title || body?.url) {
      return {
        title: body.title,
        description: body.description,
        uploadType: body.uploadType,
        url: body.url,
        isLocalFile: body.isLocalFile,
      };
    }

    throw new BadRequestException('mediaData is required or send direct fields (title, url)');
  }

  async updateFromRaw(
    id: string,
    body: any,
    files: Express.Multer.File[],
    req: Request,
  ): Promise<ShelterEntity> {
    const dto = this.parseBody(body);
    await this.validateDto(dto);
    return this.update(id, dto, req, this.mapFiles(files));
  }

  async updateMediaFromRaw(
    id: string,
    body: any,
    files: Express.Multer.File[],
    req: Request,
  ): Promise<ShelterEntity> {
    const currentShelter = await this.getService.findOne(id, req);
    if (!currentShelter) throw new BadRequestException('Shelter not found');

    const mediaDto = this.parseMediaBody(body);
    const filesDict = this.mapFiles(files);
    const hasFile = (files?.length ?? 0) > 0;

    const uploadTypeValue = mediaDto.uploadType || (hasFile ? UploadType.UPLOAD : UploadType.LINK);

    const updateDto: UpdateShelterDto = {
      teamsQuantity: currentShelter.teamsQuantity || 0,
      mediaItem: {
        title: mediaDto.title || 'Foto do Abrigo',
        description: mediaDto.description || 'Imagem principal do abrigo',
        uploadType: uploadTypeValue,
        url: mediaDto.url,
        isLocalFile: hasFile,
        fieldKey: hasFile ? files[0].fieldname : undefined,
      },
    };

    return this.update(id, updateDto, req, filesDict);
  }

  // ---------------------------------------------------------------------------
  // Core update
  // ---------------------------------------------------------------------------

  async update(
    id: string,
    dto: UpdateShelterDto,
    req: Request,
    filesDict: Record<string, Express.Multer.File> = {},
  ): Promise<ShelterEntity> {
    const ctx = await this.getCtx(req);

    if (!ctx.role || ctx.role === 'member') {
      throw new ForbiddenException('Access denied');
    }

    if (ctx.role === 'leader') {
      const allowed = await this.sheltersRepository.userHasAccessToShelter(id, ctx);
      if (!allowed) throw new NotFoundException('Shelter not found');
    }

    const currentShelter = await this.sheltersRepository.findOneOrFailForResponse(id, ctx);
    if (!currentShelter) throw new NotFoundException('Shelter not found');

    const currentTeamsQuantity = currentShelter.teamsQuantity ?? 0;

    const updatedShelter = await this.sheltersRepository.updateShelter(id, dto);

    const shouldUpdateTeams = dto.teamsQuantity !== currentTeamsQuantity || !!dto.teams;
    if (shouldUpdateTeams) {
      await this.updateTeams(id, dto, currentTeamsQuantity);
    }

    // ✅ route também se address mudar (subtitle)
    const shouldUpdateRoute = !!dto.name || dto.description !== undefined || !!dto.address;
    if (shouldUpdateRoute) {
      await this.updateRoute(id, dto);
    }

    const shouldUpdateMedia = !!dto.mediaItem && this.shouldUpdateMedia(dto.mediaItem, filesDict);
    if (shouldUpdateMedia && dto.mediaItem) {
      const mediaItemToUpdate = { ...dto.mediaItem };

      // Se veio arquivo e não veio fieldKey, usa o primeiro file
      if (
        mediaItemToUpdate.uploadType === UploadType.UPLOAD &&
        Object.keys(filesDict).length > 0 &&
        !mediaItemToUpdate.fieldKey
      ) {
        const firstKey = Object.keys(filesDict)[0];
        mediaItemToUpdate.fieldKey = firstKey;
        mediaItemToUpdate.isLocalFile = true;
      }

      await this.updateMediaItem(id, mediaItemToUpdate, filesDict);
    }

    const freshShelter = await this.sheltersRepository.findOneOrFailForResponse(id, {});
    if (!freshShelter) throw new NotFoundException('Shelter not found');

    await this.enrichShelterWithMedia(freshShelter);

    return freshShelter;
  }

  private async updateTeams(
    shelterId: string,
    dto: UpdateShelterDto,
    currentTeamsQuantity: number,
  ): Promise<void> {
    const existingTeams = await this.teamsService.findByShelter(shelterId);

    const existingTeamsMap = new Map<number, { id: string; numberTeam: number }>();
    for (const team of existingTeams) {
      existingTeamsMap.set(team.numberTeam, { id: team.id, numberTeam: team.numberTeam });
    }

    type TeamInput = NonNullable<UpdateShelterDto['teams']>[0];
    const teamsMap = new Map<number, TeamInput>();

    if (dto.teams?.length) {
      for (const team of dto.teams) {
        if (team.numberTeam < 1 || team.numberTeam > dto.teamsQuantity) {
          throw new BadRequestException(
            `numberTeam ${team.numberTeam} must be between 1 and ${dto.teamsQuantity}`,
          );
        }
        if (teamsMap.has(team.numberTeam)) {
          throw new BadRequestException(`Duplicate: team ${team.numberTeam} already defined`);
        }
        teamsMap.set(team.numberTeam, team);
      }
    }

    if (dto.teamsQuantity < currentTeamsQuantity) {
      for (let i = dto.teamsQuantity + 1; i <= currentTeamsQuantity; i++) {
        const existing = existingTeamsMap.get(i);
        if (existing) await this.teamsService.remove(existing.id);
      }
    }

    for (let i = 1; i <= dto.teamsQuantity; i++) {
      const teamData = teamsMap.get(i);
      const existing = existingTeamsMap.get(i);

      if (existing) {
        const updateTeamDto: UpdateTeamDto = {
          description: teamData?.description,
          leaderProfileIds: teamData ? teamData.leaderProfileIds ?? [] : [],
          memberProfileIds: teamData ? teamData.memberProfileIds ?? [] : [],
        };
        await this.teamsService.update(existing.id, updateTeamDto);
      } else {
        const createTeamDto: CreateTeamDto = {
          numberTeam: i,
          description: teamData?.description,
          shelterId,
          leaderProfileIds: teamData?.leaderProfileIds,
          memberProfileIds: teamData?.memberProfileIds,
        };
        await this.teamsService.create(createTeamDto);
      }
    }
  }


  private shouldUpdateMedia(
    mediaInput: { id?: string; url?: string; uploadType?: UploadType },
    filesDict: Record<string, Express.Multer.File>,
  ): boolean {
    if (filesDict && Object.keys(filesDict).length > 0) return true;

    if (mediaInput.url && !mediaInput.id) return true;

    if (mediaInput.id && mediaInput.url && mediaInput.uploadType !== UploadType.UPLOAD) return true;

    if (mediaInput.id && mediaInput.uploadType === UploadType.UPLOAD && !mediaInput.url?.startsWith('http')) {
      return false;
    }

    return false;
  }

  private async updateRoute(shelterId: string, dto: UpdateShelterDto): Promise<void> {
    const route = await this.routeService.findRouteByEntityId(shelterId);

    const shelter = await this.sheltersRepository.findOneOrFailForResponse(shelterId, {});
    if (!shelter) return;

    const subtitle = shelter.address
      ? `${shelter.address.city} - ${shelter.address.state}, ${shelter.address.district} ${shelter.address.number || ''}`.trim()
      : '';

    if (route) {
      const updateData: Partial<RouteEntity> = {};


      if (dto.name) {
        updateData.title = dto.name;
        updateData.path = this.ROUTE_PREFIX;
      }

      if (dto.description !== undefined) {
        updateData.description = dto.description ?? '';
      }

      if (dto.address) {
        updateData.subtitle = subtitle;
      }

      if (Object.keys(updateData).length > 0) {
        await this.routeService.upsertRoute(route.id, updateData);
      }

      return;
    }

    const mediaItem = await this.mediaItemProcessor.findMediaItemByTarget(shelterId, 'ShelterEntity');

    const newRoute = await this.routeService.createRoute({
      title: shelter.name,
      subtitle,
      description: shelter.description || '',
      entityType: 'ShelterPage',
      entityId: shelterId,
      idToFetch: shelterId,
      type: RouteType.PAGE,
      image: mediaItem?.url || '',
      public: true,
      prefix: this.ROUTE_PREFIX,
    });

    await this.sheltersRepository.updateShelter(shelterId, { route: newRoute } as any);
  }

  private async updateMediaItem(
    shelterId: string,
    mediaInput: {
      id?: string;
      title?: string;
      description?: string;
      uploadType?: UploadType;
      url?: string;
      isLocalFile?: boolean;
      fieldKey?: string;
    },
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<void> {
    const existingMedia = await this.mediaItemProcessor.findMediaItemByTarget(shelterId, 'ShelterEntity');

    if (existingMedia) {
      const media = this.mediaItemProcessor.buildBaseMediaItem(
        { ...mediaInput, mediaType: MediaType.IMAGE },
        shelterId,
        'ShelterEntity',
      );

      if (mediaInput.uploadType === UploadType.UPLOAD && mediaInput.isLocalFile) {
        const file = filesDict[mediaInput.fieldKey || ''];
        if (!file) {
          throw new BadRequestException(
            `File not found for upload. FieldKey: ${mediaInput.fieldKey}, Available files: ${Object.keys(filesDict).join(', ')}`,
          );
        }

        if (existingMedia.isLocalFile && existingMedia.url) {
          try {
            await this.s3Service.delete(existingMedia.url);
          } catch {
            this.logger.warn(`Could not delete old file: ${existingMedia.url}`);
          }
        }

        media.url = await this.s3Service.upload(file);
        media.isLocalFile = true;
        media.originalName = file.originalname;
        media.size = file.size;
      } else if (mediaInput.url) {
        if (existingMedia.isLocalFile && existingMedia.url) {
          try {
            await this.s3Service.delete(existingMedia.url);
          } catch {
            this.logger.warn(`Could not delete old file: ${existingMedia.url}`);
          }
        }

        media.url = mediaInput.url;
        media.isLocalFile = false;
      }

      await this.mediaItemProcessor.upsertMediaItem(existingMedia.id, media);
      await this.updateRouteImage(shelterId, media.url);
      return;
    }

    const media = this.mediaItemProcessor.buildBaseMediaItem(
      { ...mediaInput, mediaType: MediaType.IMAGE },
      shelterId,
      'ShelterEntity',
    );

    if (mediaInput.uploadType === UploadType.UPLOAD && mediaInput.isLocalFile) {
      const file = filesDict[mediaInput.fieldKey || ''];
      if (!file) {
        throw new BadRequestException(
          `File not found for upload. FieldKey: ${mediaInput.fieldKey}, Available files: ${Object.keys(filesDict).join(', ')}`,
        );
      }

      media.url = await this.s3Service.upload(file);
      media.isLocalFile = true;
      media.originalName = file.originalname;
      media.size = file.size;
    } else if (mediaInput.url) {
      media.url = mediaInput.url;
      media.isLocalFile = false;
    } else {
      throw new BadRequestException('URL or file is required');
    }

    const savedMedia = await this.mediaItemProcessor.saveMediaItem(media);
    await this.updateRouteImage(shelterId, savedMedia.url);
  }

  private async enrichShelterWithMedia(shelter: ShelterEntity): Promise<void> {
    const mediaItems = await this.mediaItemProcessor.findManyMediaItemsByTargets([shelter.id], 'ShelterEntity');
    (shelter as any).mediaItem = mediaItems.length ? mediaItems[0] : null;

    const teams: any[] = Array.isArray((shelter as any).teams) ? (shelter as any).teams : [];
    if (!teams.length) return;

    const userIdsSet = new Set<string>();
    teams.forEach((team: any) => {
      const leaders = Array.isArray(team?.leaders) ? team.leaders : [];
      const members = Array.isArray(team?.members) ? team.members : [];

      leaders.forEach((leader: any) => {
        const userId = leader?.user?.id;
        if (typeof userId === 'string' && userId) userIdsSet.add(userId);
      });

      members.forEach((member: any) => {
        const userId = member?.user?.id;
        if (typeof userId === 'string' && userId) userIdsSet.add(userId);
      });
    });

    const userIds = Array.from(userIdsSet);
    if (!userIds.length) return;

    const userMediaItems = await this.mediaItemProcessor.findManyMediaItemsByTargets(userIds, 'UserEntity');

    const mediaMap = new Map<string, any>();
    userMediaItems.forEach((item: any) => {
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
      const members = Array.isArray(team?.members) ? team.members : [];

      leaders.forEach((leader: any) => {
        const userId = leader?.user?.id;
        if (!leader?.user || typeof userId !== 'string') return;
        leader.user.mediaItem = mediaMap.get(userId) || null;
      });

      members.forEach((member: any) => {
        const userId = member?.user?.id;
        if (!member?.user || typeof userId !== 'string') return;
        member.user.mediaItem = mediaMap.get(userId) || null;
      });
    });
  }


  private async updateRouteImage(shelterId: string, imageUrl: string): Promise<void> {
    const route = await this.routeService.findRouteByEntityId(shelterId);

    if (route) {
      if (imageUrl) {
        await this.routeService.upsertRoute(route.id, { image: imageUrl });
      }
      return;
    }

    const shelter = await this.sheltersRepository.findOneOrFailForResponse(shelterId, {});
    if (!shelter) return;

    const subtitle = shelter.address
      ? `${shelter.address.city} - ${shelter.address.state}, ${shelter.address.district} ${shelter.address.number || ''}`.trim()
      : '';

    const newRoute = await this.routeService.createRoute({
      title: shelter.name,
      subtitle,
      description: shelter.description || '',
      entityType: 'ShelterEntity',
      entityId: shelterId,
      idToFetch: shelterId,
      type: RouteType.PAGE,
      image: imageUrl || '',
      public: true,
      prefix: this.ROUTE_PREFIX,
    });

    await this.sheltersRepository.updateShelter(shelterId, { route: newRoute } as any);
  }
}
