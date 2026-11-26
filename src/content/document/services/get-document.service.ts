import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  InternalServerErrorException,
} from "@nestjs/common";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { DocumentRepository } from "../document.repository";
import { DocumentDto } from "../dto/document-response.dto";
import { QueryDocumentDto } from "../dto/query-document.dto";
import { DocumentEntity } from "../entities/document.entity";
import { DocumentSortBy } from "../enums/document-sort-by.enum";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import {
  isPaginated,
  toPaginated,
} from "src/shared/list-query/list-query.util";

@Injectable()
export class GetDocumentService {
  private readonly logger = new Logger(GetDocumentService.name);

  constructor(
    @Inject(DocumentRepository)
    private readonly documentRepo: DocumentRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  async findAll(
    query?: QueryDocumentDto,
  ): Promise<DocumentDto[] | PaginatedResponseDto<DocumentDto>> {
    try {
      const { items: documents, total } =
        await this.documentRepo.findFiltered(query);
      const data = await this.toResponses(documents);
      if (query && isPaginated(query)) {
        return toPaginated(
          data,
          query,
          total,
          query.sortBy ?? DocumentSortBy.CREATED_AT,
        );
      }
      return data;
    } catch (error) {
      this.logger.error(
        "Error fetching documents",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException("Erro ao buscar documentos");
    }
  }

  private async toResponses(
    documents: DocumentEntity[],
  ): Promise<DocumentDto[]> {
    if (!documents.length) return [];

    const ids = documents.map((d) => d.id);
    const mediaItems =
      await this.mediaItemProcessor.findManyMediaItemsByTargets(
        ids,
        "document",
      );

    const mediaMap = new Map<string, (typeof mediaItems)[number]>();
    mediaItems.forEach((media) => mediaMap.set(media.targetId, media));

    return documents.map((doc) =>
      DocumentDto.fromEntity(doc, mediaMap.get(doc.id)),
    );
  }

  async findOne(id: string): Promise<DocumentDto> {
    const doc = await this.documentRepo.findOneById(id);
    if (!doc) {
      this.logger.warn(`Document not found: ID=${id}`);
      throw new NotFoundException("Document not found");
    }

    const media = await this.mediaItemProcessor.findMediaItemsByTarget(
      id,
      "document",
    );
    return DocumentDto.fromEntity(doc, media[0]);
  }
}
