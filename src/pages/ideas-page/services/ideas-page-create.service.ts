import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { RouteService } from 'src/route/route.service';
import { RouteType } from 'src/route/route-page.entity';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { MediaType } from 'src/share/media/media-item/media-item.entity';
import { MediaTargetType } from 'src/share/media/media-target-type.enum';
import { CreateIdeasPageDto } from '../dto/create-ideas-page.dto';
import { IdeasPageResponseDto } from '../dto/ideas-page-response.dto';
import { IdeasPageEntity } from '../entities/ideas-page.entity';
import { IdeasSectionEntity } from '../entities/ideas-section.entity';

@Injectable()
export class IdeasPageCreateService {
  private readonly logger = new Logger(IdeasPageCreateService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly s3: AwsS3Service,
    private readonly routeService: RouteService,
    private readonly mediaProcessor: MediaItemProcessor,
  ) { }

  async createIdeasPage(
    dto: CreateIdeasPageDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<IdeasPageResponseDto> {

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      const page = await this.persistPageWithSections(runner, dto);
      await this.attachRoute(runner, page, dto);
      await this.processMediaPerSection(page, dto, filesDict);

      await runner.commitTransaction();

      return plainToInstance(IdeasPageResponseDto, page);
    } catch (err) {
      await runner.rollbackTransaction();
      this.logger.error('💥  Transaction rolled‑back', err.stack);
      throw new BadRequestException(
        `Erro ao criar a página de ideias: ${err.message}`,
      );
    } finally {
      await runner.release();
    }
  }

  private async persistPageWithSections(
    runner: QueryRunner,
    dto: CreateIdeasPageDto,
  ): Promise<IdeasPageEntity> {

    const pageRepo = runner.manager.getRepository(IdeasPageEntity);
    const sectionRepo = runner.manager.getRepository(IdeasSectionEntity);

    const page = pageRepo.create({
      title: dto.title,
      subtitle: dto.subtitle,
      description: dto.description,
    });
    const savedPage = await pageRepo.save(page);

    for (const s of dto.sections) {
      const section = sectionRepo.create({
        title: s.title,
        description: s.description,
        page: savedPage,
      });
      const savedSection = await sectionRepo.save(section);
    }

    return (await pageRepo.findOne({
      where: { id: savedPage.id },
      relations: ['sections', 'route'],
    })) as IdeasPageEntity;
  }

  private async attachRoute(
    runner: QueryRunner,
    page: IdeasPageEntity,
    dto: CreateIdeasPageDto,
  ): Promise<void> {

    const path = await this.routeService.generateAvailablePath(
      dto.title,
      'galeria_ideias_',
    );

    const route = await this.routeService.createRouteWithManager(
      runner.manager,
      {
        title: dto.title,
        subtitle: dto.subtitle || '',
        description: dto.description,
        path,
        type: RouteType.PAGE,
        entityId: page.id,
        idToFetch: page.id,
        entityType: MediaTargetType.IdeasPage,
        image: 'https://clubinho-nib.s3.us-east-1.amazonaws.com/production/cards/card_ideias.png',
        public: false,
      },
    );

    page.route = route;
    await runner.manager.save(page);
  }

  private async processMediaPerSection(
    page: IdeasPageEntity,
    dto: CreateIdeasPageDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<void> {

    for (const [idx, secDto] of dto.sections.entries()) {
      const dbSection = page.sections[idx];

      if (!secDto.medias?.length) {
        continue;
      }

      const normalized = secDto.medias.map((item) => ({
        ...item,
        mediaType:
          item.mediaType === MediaType.VIDEO ? MediaType.VIDEO : item.mediaType === MediaType.DOCUMENT ? MediaType.DOCUMENT : MediaType.IMAGE,
        type: item.uploadType,
        fileField:
          item.uploadType === 'upload' && item.isLocalFile
            ? item.fieldKey
            : undefined,
      }));

      const saved = await this.mediaProcessor.processMediaItemsPolymorphic(
        normalized,
        dbSection.id,
        MediaTargetType.IdeasSection,
        filesDict,
        this.s3.upload.bind(this.s3),
      );

    }

  }
}
