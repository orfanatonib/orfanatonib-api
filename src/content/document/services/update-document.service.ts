import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { RouteService } from 'src/infrastructure/route/route.service';
import { RouteType, RouteEntity } from 'src/infrastructure/route/route-page.entity';
import { DocumentRepository } from '../document.repository';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { DocumentEntity } from '../entities/document.entity';

@Injectable()
export class UpdateDocumentService {
  private readonly logger = new Logger(UpdateDocumentService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly documentRepo: DocumentRepository,
    private readonly s3Service: AwsS3Service,
    private readonly mediaProcessor: MediaItemProcessor,
    private readonly routeService: RouteService,
  ) { }

  async execute(
    id: string,
    dto: UpdateDocumentDto & { isLocalFile?: boolean },
    file?: Express.Multer.File,
  ): Promise<DocumentEntity> {
    const existingDocument = await this.documentRepo.findOneWithRelations(id);
    if (!existingDocument) {
      throw new NotFoundException('Document not found.');
    }

    if (!dto.media) {
      throw new BadRequestException('Media data is required.');
    }

    return await this.dataSource.transaction(async (manager) => {
      const updatedDocument = manager.merge(DocumentEntity, existingDocument, {
        name: dto.name,
        description: dto.description,
      });
      const savedDocument = await manager.save(DocumentEntity, updatedDocument);

      if (savedDocument.route) {
        const updatedRoute = await this.upsertDocumentRoute(
          savedDocument.route.id,
          {
            name: dto.name,
            subtitle: dto.media.title,
            description: dto.description,
          },
          savedDocument.id,
        );
        savedDocument.route = updatedRoute;
      }

      const existingMedia = await this.mediaProcessor.findMediaItemsByTarget(
        savedDocument.id,
        'document',
      );

      const isReplacingMedia = !dto.media.id;

      if (isReplacingMedia) {
        const filesDict = file ? { [dto.media.fileField ?? 'file']: file } : {};

        await this.mediaProcessor.cleanAndReplaceMediaItems(
          [
            {
              title: dto.media.title ?? savedDocument.name,
              description: dto.media.description ?? `Document: ${savedDocument.name}`,
              mediaType: dto.media.mediaType,
              uploadType: dto.media.uploadType,
              platformType: dto.media.isLocalFile ? undefined : dto.media.platformType,
              url: dto.media.url,
              originalName: dto.media.originalName,
              size: dto.media.size,
              isLocalFile: dto.media.isLocalFile,
              public: false,
            },
          ],
          savedDocument.id,
          'document',
          filesDict,
          existingMedia,
          (url) => this.s3Service.delete(url),
          (file) => this.s3Service.upload(file),
        );
      } else if (existingMedia.length > 0) {
        const mediaToUpdate = existingMedia[0];

        const wasUpload = mediaToUpdate.isLocalFile === true;
        const isNowLink = dto.media.isLocalFile === false;
        const wasLink = mediaToUpdate.isLocalFile === false;
        const isNowUpload = dto.media.isLocalFile === true;

        if (wasUpload && isNowLink && mediaToUpdate.url) {
          await this.s3Service.delete(mediaToUpdate.url);
        }

        if (wasLink && isNowUpload) {
          if (!file) {
            throw new BadRequestException('Upload file is required when changing to upload.');
          }
          const newUrl = await this.s3Service.upload(file);
          dto.media.url = newUrl;
          dto.media.originalName = file.originalname;
          dto.media.size = file.size;
        }

        mediaToUpdate.title = dto.media.title ?? mediaToUpdate.title;
        mediaToUpdate.description = dto.media.description ?? mediaToUpdate.description;
        mediaToUpdate.uploadType = dto.media.uploadType;
        mediaToUpdate.platformType = dto.media.isLocalFile ? undefined : dto.media.platformType;
        mediaToUpdate.url = dto.media.url ?? mediaToUpdate.url;
        mediaToUpdate.originalName = dto.media.originalName ?? mediaToUpdate.originalName;
        mediaToUpdate.size = dto.media.size ?? mediaToUpdate.size;
        mediaToUpdate.isLocalFile = dto.media.isLocalFile;

        await manager.save(mediaToUpdate);
      }

      return savedDocument;
    });
  }

  private async upsertDocumentRoute(
    routeId: string,
    documentData: { name: string; subtitle?: string; description?: string },
    documentId: string,
  ): Promise<RouteEntity> {
    const routeData: Partial<RouteEntity> = {
      title: documentData.name,
      subtitle: documentData.subtitle ?? documentData.name,
      description: documentData.description ?? '',
      idToFetch: documentId,
      entityType: 'Document',
      entityId: documentId,
      public: false,
      type: RouteType.PAGE,
      path: 'documento_',
      image: 'https://bucket-orfanato-galeria.s3.us-east-2.amazonaws.com/uploads/img_card.jpg',
    };

    return this.routeService.upsertRoute(routeId, routeData);
  }
}
