import { Injectable, Logger, BadRequestException, ValidationPipe } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { RouteService } from 'src/route/route.service';
import { RouteType } from 'src/route/route-page.entity';
import { MediaTargetType } from 'src/share/media/media-target-type.enum';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { VisitMaterialsPageRepository } from '../visit-material.repository';
import { MediaItemEntity, MediaType, UploadType } from 'src/share/media/media-item/media-item.entity';
import { CreateVisitMaterialsPageDto } from '../dto/create-visit-material.dto';
import { VisitMaterialsPageResponseDTO } from '../dto/visit-material-response.dto';
import { VisitMaterialsPageEntity, TestamentType } from '../entities/visit-material-page.entity';
import { MediaItemDto } from 'src/share/share-dto/media-item-dto';

@Injectable()
export class VisitMaterialsPageCreateService {
  private readonly logger = new Logger(VisitMaterialsPageCreateService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly repo: VisitMaterialsPageRepository,
    private readonly s3: AwsS3Service,
    private readonly routeService: RouteService,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) { }

  async createFromRaw(
    raw: string,
    files: Express.Multer.File[],
  ): Promise<VisitMaterialsPageResponseDTO> {

    if (!raw) {
      throw new BadRequestException('visitMaterialsPageData is required.');
    }

    try {
      const parsed = JSON.parse(raw);
      const dto: CreateVisitMaterialsPageDto = await new ValidationPipe({ transform: true }).transform(parsed, {
        type: 'body',
        metatype: CreateVisitMaterialsPageDto,
      });

      const filesDict = Object.fromEntries(files.map((f) => [f.fieldname, f]));

      return this.createVisitMaterialsPage(dto, filesDict);
    } catch (err) {
      this.logger.error('Error processing data for creation', err);
      throw new BadRequestException('Error creating materials page: ' + err.message);
    }
  }

  async createVisitMaterialsPage(
    dto: CreateVisitMaterialsPageDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<VisitMaterialsPageResponseDTO> {

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedPage: VisitMaterialsPageEntity;
    let mediaItems: MediaItemEntity[] = [];

    try {
      const page = queryRunner.manager.create(VisitMaterialsPageEntity, {
        title: dto.pageTitle,
        subtitle: dto.pageSubtitle,
        testament: dto.testament || TestamentType.OLD_TESTAMENT,
        description: dto.pageDescription,
      });
      savedPage = await queryRunner.manager.save(page);

      const path = await this.routeService.generateAvailablePath(dto.pageTitle, 'materiais_visita_');
      const route = await this.routeService.createRouteWithManager(queryRunner.manager, {
        title: dto.pageTitle,
        subtitle: dto.pageSubtitle,
        description: dto.pageDescription,
        path,
        type: RouteType.PAGE,
        entityId: savedPage.id,
        idToFetch: savedPage.id,
        entityType: 'VisitMaterialsPage',
        image: 'https://orfanatos-nib-storage.s3.us-east-1.amazonaws.com/aux/card_materiais.png',
        public: true,
        current: false
      });

      savedPage.route = route;
      await queryRunner.manager.save(savedPage);

      const adjustedMediaItems = this.mergeAndFixMedia({
        videos: dto.videos || [],
        documents: dto.documents || [],
        images: dto.images || [],
        audios: dto.audios || [],
      });

      mediaItems = await this.mediaItemProcessor.processMediaItemsPolymorphic(
        adjustedMediaItems,
        savedPage.id,
        MediaTargetType.VisitMaterialsPage,
        filesDict,
        this.s3.upload.bind(this.s3),
      );

      await queryRunner.commitTransaction();

      return VisitMaterialsPageResponseDTO.fromEntity(savedPage, mediaItems);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error creating page. Rollback executed.', error);
      throw new BadRequestException(`Erro ao criar a página de materiais: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  private mergeAndFixMedia(dto: {
    videos: MediaItemDto[];
    documents: MediaItemDto[];
    images: MediaItemDto[];
    audios: MediaItemDto[];
  }): MediaItemDto[] {

    const videos = (dto.videos || []).map((media) => ({
      ...media,
      mediaType: MediaType.VIDEO,
      fileField: media.uploadType === UploadType.UPLOAD && media.isLocalFile ? media.fieldKey : undefined,
    }));
    const documents = (dto.documents || []).map((media) => ({
      ...media,
      mediaType: MediaType.DOCUMENT,
      fileField: media.uploadType === UploadType.UPLOAD && media.isLocalFile ? media.fieldKey : undefined,
    }));
    const images = (dto.images || []).map((media) => ({
      ...media,
      mediaType: MediaType.IMAGE,
      fileField:  media.uploadType === UploadType.UPLOAD && media.isLocalFile ? media.fieldKey : undefined,
    }));
    const audios = (dto.audios || []).map((media) => ({
      ...media,
      mediaType: MediaType.AUDIO,
      fileField:  media.uploadType === UploadType.UPLOAD && media.isLocalFile ? media.fieldKey : undefined,
    }));

    const mediaItems = [...videos, ...documents, ...images, ...audios];

    mediaItems.forEach((item) => {
      if ( item.uploadType === UploadType.UPLOAD && item.isLocalFile && !item.fileField) {
        throw new BadRequestException(`fieldKey ausente para item de mídia: ${item.title}`);
      }
    });

    return mediaItems;
  }
}

