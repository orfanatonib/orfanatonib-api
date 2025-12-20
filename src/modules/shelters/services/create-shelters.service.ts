import { ForbiddenException, Injectable, BadRequestException, Inject, forwardRef, NotFoundException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SheltersRepository } from '../repositories/shelters.repository';
import { CreateShelterDto } from '../dto/create-shelter.dto';
import { CreateShelterRequestDto } from '../dto/create-shelter-request.dto';
import { AuthContextService } from 'src/auth/services/auth-context.service';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { MediaType, UploadType } from 'src/share/media/media-item/media-item.entity';
import { RouteService } from 'src/route/route.service';
import { RouteType } from 'src/route/route-page.entity';
import { ShelterEntity } from '../entities/shelter.entity/shelter.entity';
import { TeamsService } from 'src/modules/teams/services/teams.service';
import { CreateTeamDto } from 'src/modules/teams/dto/create-team.dto';

type Ctx = { role?: string; userId?: string | null };

@Injectable()
export class CreateSheltersService {
  private readonly logger = new Logger(CreateSheltersService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly sheltersRepository: SheltersRepository,
    private readonly authCtx: AuthContextService,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly s3Service: AwsS3Service,
    private readonly routeService: RouteService,
    @Inject(forwardRef(() => TeamsService))
    private readonly teamsService: TeamsService,
  ) { }

  private async getCtx(req: Request): Promise<Ctx> {
    const p = await this.authCtx.tryGetPayload(req);
    return { role: p?.role?.toLowerCase(), userId: p?.sub ?? null };
  }

  parseAndValidateBody(body: any): CreateShelterDto {
    let dto: CreateShelterDto;
    
    if (body.shelterData) {
      const parsed = typeof body.shelterData === 'string' 
        ? JSON.parse(body.shelterData) 
        : body.shelterData;
      dto = plainToInstance(CreateShelterDto, parsed);
    } else if (body.name) {
      dto = plainToInstance(CreateShelterDto, body);
    } else {
      throw new BadRequestException('Shelter data not provided. Use "shelterData" in form-data or send JSON directly.');
    }

    return dto;
  }

  async validateDto(dto: CreateShelterDto): Promise<void> {
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

  async createFromRaw(body: any, files: Express.Multer.File[], req: Request): Promise<ShelterEntity> {
    const dto = this.parseAndValidateBody(body);
    await this.validateDto(dto);
    const filesDict = this.mapFiles(files);
    return this.create(dto, req, filesDict);
  }

  async create(dto: CreateShelterDto, req: Request, filesDict?: Record<string, Express.Multer.File>) {
    const ctx = await this.getCtx(req);
    if (!ctx.role || ctx.role === 'teacher') {
      throw new ForbiddenException('Acesso negado');
    }


    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const shelter = await this.sheltersRepository.createShelter(dto);
      await this.createTeams(shelter.id, dto);

      let imageUrl = '';
      if (dto.mediaItem && filesDict) {
        imageUrl = await this.createMediaItem(shelter.id, dto.mediaItem, filesDict);
      }

      await this.createRoute(queryRunner, shelter, dto, imageUrl);
      await queryRunner.commitTransaction();

      const completeShelter = await this.sheltersRepository.findOneOrFailForResponse(shelter.id);
      if (!completeShelter) {
        throw new NotFoundException('Shelter not found after creation');
      }
      return completeShelter;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async createTeams(shelterId: string, dto: CreateShelterDto): Promise<void> {
    type TeamInput = NonNullable<CreateShelterDto['teams']>[0];
    const teamsMap = new Map<number, TeamInput>();
    const teacherIdsUsed = new Set<string>();
    
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
        
        if (team.teacherProfileIds && team.teacherProfileIds.length > 0) {
          for (const teacherId of team.teacherProfileIds) {
            if (teacherIdsUsed.has(teacherId)) {
              throw new BadRequestException(
                `Teacher with ID ${teacherId} cannot be in multiple teams. A teacher can only belong to one team.`
              );
        }
            teacherIdsUsed.add(teacherId);
          }
        }
        
        teamsMap.set(team.numberTeam, team);
      }
    }

    for (let i = 1; i <= dto.teamsQuantity; i++) {
      const teamData = teamsMap.get(i);
      
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

  private async createRoute(queryRunner: any, shelter: ShelterEntity, dto: CreateShelterDto, imageUrl: string = '') {
    const path = await this.routeService.generateAvailablePath(shelter.name, 'abrigo_');
    
    const address = shelter.address;
    const subtitle = address 
      ? `${address.city} - ${address.state}, ${address.district} ${address.number || ''}`
      : 'Shelter';
    
    const route = await this.routeService.createRouteWithManager(queryRunner.manager, {
      title: shelter.name,
      subtitle: subtitle.trim(),
      description: dto.description || 'Shelter dedicated to caring for children and adolescents',
      path,
      type: RouteType.PAGE,
      entityId: shelter.id,
      idToFetch: shelter.id,
      entityType: 'shelterPage',
      image: imageUrl,
      public: true,
    });

    shelter.route = route;
    await queryRunner.manager.save(ShelterEntity, shelter);
  }

  private async createMediaItem(
    shelterId: string,
    mediaInput: { 
      uploadType?: UploadType; 
      isLocalFile?: boolean; 
      fieldKey?: string; 
      url?: string;
      title?: string;
      description?: string;
    },
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<string> {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      { ...mediaInput, mediaType: MediaType.IMAGE },
      shelterId,
      'ShelterEntity',
    );

    if (mediaInput.uploadType === UploadType.UPLOAD && mediaInput.isLocalFile) {
      const file = filesDict[mediaInput.fieldKey || ''];
      if (!file) {
        throw new BadRequestException('File not found for upload');
      }

      media.url = await this.s3Service.upload(file);
      media.isLocalFile = true;
      media.originalName = file.originalname;
      media.size = file.size;
    } else if (mediaInput.url) {
      media.url = mediaInput.url;
      media.isLocalFile = false;
    } else {
      throw new BadRequestException('URL or file is required for media item');
    }

    const savedMedia = await this.mediaItemProcessor.saveMediaItem(media);
    return savedMedia.url;
  }
}