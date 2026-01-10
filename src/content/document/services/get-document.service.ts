import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { DocumentRepository } from '../document.repository';
import { DocumentDto } from '../dto/document-response.dto';

@Injectable()
export class GetDocumentService {
  private readonly logger = new Logger(GetDocumentService.name);

  constructor(
    @Inject(DocumentRepository)
    private readonly documentRepo: DocumentRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  async findAll(): Promise<DocumentDto[]> {

    try {
      const documents = await this.documentRepo.findAllSorted();
      if (!documents.length) return [];

      const ids = documents.map((d) => d.id);
      const mediaItems = await this.mediaItemProcessor.findManyMediaItemsByTargets(ids, 'document');

      const mediaMap = new Map<string, typeof mediaItems[number]>();
      mediaItems.forEach((media) => mediaMap.set(media.targetId, media));

      return documents.map((doc) => DocumentDto.fromEntity(doc, mediaMap.get(doc.id)));
    } catch (error) {
      this.logger.error('Error fetching documents', error.stack);
      throw new InternalServerErrorException('Erro ao buscar documentos');
    }
  }

  async findOne(id: string): Promise<DocumentDto> {

    const doc = await this.documentRepo.findOneById(id);
    if (!doc) {
      this.logger.warn(`Document not found: ID=${id}`);
      throw new NotFoundException('Document not found');
    }

    const media = await this.mediaItemProcessor.findMediaItemsByTarget(id, 'document');
    return DocumentDto.fromEntity(doc, media[0]);
  }
}
