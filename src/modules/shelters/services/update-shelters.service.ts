import { ForbiddenException, Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { Request } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SheltersRepository } from '../repositories/shelters.repository';
import { UpdateShelterDto } from '../dto/update-shelter.dto';
import { UpdateShelterRequestDto } from '../dto/update-shelter-request.dto';
import { UpdateShelterMediaRequestDto } from '../dto/update-shelter-media-request.dto';
import { AuthContextService } from 'src/auth/services/auth-context.service';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { MediaType, UploadType } from 'src/share/media/media-item/media-item.entity';
import { RouteService } from 'src/route/route.service';
import { RouteType } from 'src/route/route-page.entity';
import { GetSheltersService } from './get-shelters.service';
import { ShelterEntity } from '../entities/shelter.entity/shelter.entity';
import { TeamsService } from 'src/modules/teams/services/teams.service';
import { CreateTeamDto } from 'src/modules/teams/dto/create-team.dto';
import { UpdateTeamDto } from 'src/modules/teams/dto/update-team.dto';

type Ctx = { role?: string; userId?: string | null };

@Injectable()
export class UpdateSheltersService {
  private readonly logger = new Logger(UpdateSheltersService.name);

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

  parseAndValidateBody(body: any): UpdateShelterDto {
    let dto: UpdateShelterDto;
    
    if (body.shelterData) {
      const parsed = typeof body.shelterData === 'string' 
        ? JSON.parse(body.shelterData) 
        : body.shelterData;
      dto = plainToInstance(UpdateShelterDto, parsed);
    } else {
      dto = plainToInstance(UpdateShelterDto, body);
    }

    return dto;
  }

  async validateDto(dto: UpdateShelterDto): Promise<void> {
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
  }

  mapFiles(files: Express.Multer.File[]): Record<string, Express.Multer.File> {
    const filesDict: Record<string, Express.Multer.File> = {};
    files.forEach((file) => {
      filesDict[file.fieldname] = file;
    });
    return filesDict;
  }

  async updateFromRaw(id: string, body: any, files: Express.Multer.File[], req: Request): Promise<ShelterEntity> {
    const dto = this.parseAndValidateBody(body);
    await this.validateDto(dto);
    const filesDict = this.mapFiles(files);
    
    return this.update(id, dto, req, filesDict);
  }

  async updateMediaFromRaw(id: string, body: any, files: Express.Multer.File[], req: Request): Promise<ShelterEntity> {
    const currentShelter = await this.getService.findOne(id, req);
    if (!currentShelter) {
      throw new BadRequestException('Shelter not found');
    }

    let mediaDto: { title?: string; description?: string; uploadType?: UploadType; url?: string; isLocalFile?: boolean };
    if (body.mediaData) {
      mediaDto = typeof body.mediaData === 'string' 
        ? JSON.parse(body.mediaData) 
        : body.mediaData;
    } else if (body.title || body.url) {
      mediaDto = {
        title: body.title,
        description: body.description,
        uploadType: body.uploadType,
        url: body.url,
        isLocalFile: body.isLocalFile,
      };
    } else {
      throw new BadRequestException('mediaData is required or send direct fields (title, url)');
    }

    const filesDict = this.mapFiles(files);
    const hasFile = files.length > 0;
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

  async update(id: string, dto: UpdateShelterDto, req: Request, filesDict?: Record<string, Express.Multer.File>) {
    const ctx = await this.getCtx(req);
    
    if (!ctx.role || ctx.role === 'teacher') {
      throw new ForbiddenException('Access denied');
    }

    if (ctx.role === 'leader') {
      const allowed = await this.sheltersRepository.userHasAccessToShelter(id, ctx);
      if (!allowed) throw new NotFoundException('Shelter not found');
    }

    const currentShelter = await this.sheltersRepository.findOneOrFailForResponse(id, ctx);
    if (!currentShelter) {
      throw new NotFoundException('Shelter not found');
    }
    const currentTeamsQuantity = currentShelter.teamsQuantity ?? 0;

    const updatedShelter = await this.sheltersRepository.updateShelter(id, dto);

    const shouldUpdateTeams = dto.teamsQuantity !== currentTeamsQuantity || dto.teams;
    
    if (shouldUpdateTeams) {
      await this.updateTeams(id, dto, currentTeamsQuantity);
    }

    const shouldUpdateRoute = dto.name || dto.description;
    if (shouldUpdateRoute) {
      await this.updateRoute(id, dto);
    }

    const shouldUpdateMedia = dto.mediaItem && this.shouldUpdateMedia(dto.mediaItem, filesDict || {});
    if (shouldUpdateMedia && dto.mediaItem) {
      const mediaItemToUpdate = { ...dto.mediaItem };
      if (mediaItemToUpdate.uploadType === UploadType.UPLOAD && filesDict && Object.keys(filesDict).length > 0 && !mediaItemToUpdate.fieldKey) {
        const firstFileKey = Object.keys(filesDict)[0];
        mediaItemToUpdate.fieldKey = firstFileKey;
        mediaItemToUpdate.isLocalFile = true;
      }
      
      await this.updateMediaItem(id, mediaItemToUpdate, filesDict || {});
    }

    return updatedShelter;
  }

  private async updateTeams(shelterId: string, dto: UpdateShelterDto, currentTeamsQuantity: number): Promise<void> {
    const existingTeams = await this.teamsService.findByShelter(shelterId);
    
    const existingTeamsMap = new Map<number, { id: string; numberTeam: number }>();
    existingTeams.forEach(team => {
      existingTeamsMap.set(team.numberTeam, { id: team.id, numberTeam: team.numberTeam });
    });

    type TeamInput = NonNullable<UpdateShelterDto['teams']>[0];
    const teamsMap = new Map<number, TeamInput>();
    
    if (dto.teams && dto.teams.length > 0) {
      for (const team of dto.teams) {
        if (team.numberTeam < 1 || team.numberTeam > dto.teamsQuantity) {
          throw new BadRequestException(
            `numberTeam ${team.numberTeam} must be between 1 and ${dto.teamsQuantity}`
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
        const existingTeam = existingTeamsMap.get(i);
        if (existingTeam) {
          await this.teamsService.remove(existingTeam.id);
        }
      }
    }

    for (let i = 1; i <= dto.teamsQuantity; i++) {
      const teamData = teamsMap.get(i);
      const existingTeam = existingTeamsMap.get(i);

      if (existingTeam) {
        const leaderIds = teamData ? (teamData.leaderProfileIds ?? []) : [];
        const teacherIds = teamData ? (teamData.teacherProfileIds ?? []) : [];
        
        const updateTeamDto: UpdateTeamDto = {
          description: teamData?.description,
          leaderProfileIds: leaderIds,
          teacherProfileIds: teacherIds,
        };
        
        await this.teamsService.update(existingTeam.id, updateTeamDto);
      } else {
        const createTeamDto: CreateTeamDto = {
          numberTeam: i,
          description: teamData?.description,
          shelterId: shelterId,
          leaderProfileIds: teamData?.leaderProfileIds,
          teacherProfileIds: teamData?.teacherProfileIds,
        };
        await this.teamsService.create(createTeamDto);
      }
    }
  }

  private shouldUpdateMedia(
    mediaInput: { 
      id?: string; 
      url?: string; 
      uploadType?: UploadType; 
    }, 
    filesDict: Record<string, Express.Multer.File>
  ): boolean {
    if (filesDict && Object.keys(filesDict).length > 0) {
      return true;
    }

    if (mediaInput.url && !mediaInput.id) {
      return true;
    }

    if (mediaInput.id && mediaInput.url && mediaInput.uploadType !== UploadType.UPLOAD) {
      return true;
    }

    if (mediaInput.id && mediaInput.uploadType === UploadType.UPLOAD && !mediaInput.url?.startsWith('http')) {
      return false;
    }

    return false;
  }

  private async updateRoute(shelterId: string, dto: UpdateShelterDto) {
    const route = await this.routeService.findRouteByEntityId(shelterId);

    if (route) {
      const updateData: any = {};

      if (dto.name) {
        updateData.title = dto.name;
        updateData.path = this.generateRoutePath(dto.name);
      }
      if (dto.description) {
        updateData.description = dto.description;
      }

      if (dto.address && (dto.address.city || dto.address.state || dto.address.district || dto.address.number)) {
        const updatedShelter = await this.sheltersRepository.findOneOrFailForResponse(shelterId, {});
        if (updatedShelter && updatedShelter.address) {
          const addr = updatedShelter.address;
          updateData.subtitle = `${addr.city} - ${addr.state}, ${addr.district} ${addr.number || ''}`.trim();
        }
      }

      if (Object.keys(updateData).length > 0) {
        await this.routeService.updateRoute(route.id, updateData);
      }
    } else {
      const shelter = await this.sheltersRepository.findOneOrFailForResponse(shelterId, {});
      
      if (shelter) {
        const routePath = this.generateRoutePath(shelter.name);
        const subtitle = shelter.address
          ? `${shelter.address.city} - ${shelter.address.state}, ${shelter.address.district} ${shelter.address.number || ''}`.trim()
          : '';

        const mediaItem = await this.mediaItemProcessor.findMediaItemByTarget(shelterId, 'ShelterEntity');

        const newRoute = await this.routeService.createRoute({
          title: shelter.name,
          subtitle: subtitle,
          description: shelter.description || '',
          path: routePath,
          entityType: 'ShelterPage',
          entityId: shelterId,
          idToFetch: shelterId,
          type: RouteType.PAGE,
          image: mediaItem?.url || '',
          public: true,
        });

        await this.sheltersRepository.updateShelter(shelterId, { route: newRoute } as any);
      }
    }
  }

  private generateRoutePath(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
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
  ) {
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
          throw new BadRequestException(`File not found for upload. FieldKey: ${mediaInput.fieldKey}, Available files: ${Object.keys(filesDict).join(', ')}`);
        }

        if (existingMedia.isLocalFile && existingMedia.url) {
          try {
            await this.s3Service.delete(existingMedia.url);
          } catch (error) {
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
          } catch (error) {
            this.logger.warn(`Could not delete old file: ${existingMedia.url}`);
          }
        }
        
        media.url = mediaInput.url;
        media.isLocalFile = false;
      }

      await this.mediaItemProcessor.upsertMediaItem(existingMedia.id, media);
      await this.updateRouteImage(shelterId, media.url);
    } else {
      const media = this.mediaItemProcessor.buildBaseMediaItem(
        { ...mediaInput, mediaType: MediaType.IMAGE },
        shelterId,
        'ShelterEntity',
      );

      if (mediaInput.uploadType === UploadType.UPLOAD && mediaInput.isLocalFile) {
        const file = filesDict[mediaInput.fieldKey || ''];
        if (!file) {
          throw new BadRequestException(`File not found for upload. FieldKey: ${mediaInput.fieldKey}, Available files: ${Object.keys(filesDict).join(', ')}`);
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
  }

  private async updateRouteImage(shelterId: string, imageUrl: string) {
    const route = await this.routeService.findRouteByEntityId(shelterId);
    
    if (route) {
      if (imageUrl) {
        await this.routeService.updateRoute(route.id, { image: imageUrl } as any);
      }
    } else {
      const shelter = await this.sheltersRepository.findOneOrFailForResponse(shelterId, {});
      
      if (shelter) {
        const routePath = this.generateRoutePath(shelter.name);
        const subtitle = shelter.address
          ? `${shelter.address.city} - ${shelter.address.state}, ${shelter.address.district} ${shelter.address.number || ''}`.trim()
          : '';

        const newRoute = await this.routeService.createRoute({
          title: shelter.name,
          subtitle: subtitle,
          description: shelter.description || '',
          path: routePath,
          entityType: 'ShelterEntity',
          entityId: shelterId,
          idToFetch: shelterId,
          type: RouteType.PAGE,
          image: imageUrl || '',
          public: true,
        });

        await this.sheltersRepository.updateShelter(shelterId, { route: newRoute } as any);
      }
    }
  }
}