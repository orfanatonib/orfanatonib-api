import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';
import { RouteService } from 'src/infrastructure/route/route.service';
import { RouteType } from 'src/infrastructure/route/route-page.entity';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { MediaType } from 'src/shared/media/media-item/media-item.entity';
import { MediaTargetType } from 'src/shared/media/media-target-type.enum';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { DocumentDto } from '../dto/document-response.dto';
import { DocumentRepository } from '../document.repository';
import { DocumentEntity } from '../entities/document.entity';

@Injectable()
export class CreateDocumentService {
  private readonly logger = new Logger(CreateDocumentService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly documentRepo: DocumentRepository,
    private readonly s3Service: AwsS3Service,
    private readonly routeService: RouteService,
    private readonly mediaProcessor: MediaItemProcessor,
  ) { }

  async createDocument(
    dto: CreateDocumentDto,
    file?: Express.Multer.File,
  ): Promise<DocumentDto> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      const savedDoc = await this.persistDocument(runner, dto);
      const route = await this.attachRoute(runner, savedDoc, dto);
      const media = await this.processMedia(runner, savedDoc.id, dto, file);

      await runner.commitTransaction();

      return DocumentDto.fromEntity(savedDoc, media);
    } catch (err) {
      await runner.rollbackTransaction();
      this.logger.error('Transaction rolled back', err.stack);
      throw new BadRequestException(
        `Error creating document: ${err.message}`,
      );
    } finally {
      await runner.release();
    }
  }

  private async persistDocument(
    runner: QueryRunner,
    dto: CreateDocumentDto,
  ): Promise<DocumentEntity> {
    const docRepo = runner.manager.getRepository(DocumentEntity);

    const doc = docRepo.create({
      name: dto.name,
      description: dto.description,
    });
    return docRepo.save(doc);
  }

  private async attachRoute(
    runner: QueryRunner,
    document: DocumentEntity,
    dto: CreateDocumentDto,
  ): Promise<void> {
    const path = await this.routeService.generateAvailablePath(
      dto.name,
      'documento_',
    );

    const route = await this.routeService.createRouteWithManager(
      runner.manager,
      {
        title: dto.name,
        subtitle: dto.media.title || '',
        description: dto.description || '',
        path,
        type: RouteType.DOC,
        entityId: document.id,
        idToFetch: document.id,
        entityType: 'Document',
        image:
          'https://bucket-orfanato-galeria.s3.us-east-2.amazonaws.com/uploads/img_card.jpg',
        public: false,
      },
    );

    document.route = route;
    await runner.manager.save(document);
  }

  private async processMedia(
    runner: QueryRunner,
    documentId: string,
    dto: CreateDocumentDto,
    file?: Express.Multer.File,
  ) {
    let mediaUrl = dto.media.url?.trim() || '';
    let originalName = dto.media.originalName;
    let size = dto.media.size;

    if (dto.media.isLocalFile) {
      if (!file) {
        throw new BadRequestException('Required file not sent.');
      }

      try {
        mediaUrl = await this.s3Service.upload(file);
        originalName = file.originalname;
        size = file.size;
      } catch (error) {
        this.logger.error(
          `Error uploading file: ${file.originalname}`,
          error.stack,
        );
        throw new InternalServerErrorException('File upload failed.');
      }
    }

    const mediaEntity = this.mediaProcessor.buildBaseMediaItem(
      {
        title: dto.media.title,
        description: dto.media.description,
        mediaType: MediaType.DOCUMENT,
        uploadType: dto.media.uploadType,
        platformType: dto.media.platformType,
        fileField: dto.media.fileField ?? 'file',
        isLocalFile: dto.media.isLocalFile,
        url: mediaUrl,
        originalName,
        size,
      },
      documentId,
      MediaTargetType.Document,
    );

    return this.mediaProcessor.saveMediaItem(mediaEntity);
  }
}
