import { Injectable } from "@nestjs/common";
import { GetImageSectionService } from "src/content/page/image-section/services/get-image-section.service";
import { ImageSectionCommentRepository } from "../repositories/image-section-comment.repository";
import {
  FeedCommentResponseDto,
  PaginatedFeedCommentsResponseDto,
} from "../dto/feed-comment-response.dto";
import { FeedCommentActor } from "../types";

@Injectable()
export class GetFeedCommentService {
  constructor(
    private readonly repository: ImageSectionCommentRepository,
    private readonly sections: GetImageSectionService,
  ) {}

  async list(
    sectionId: string,
    actor: FeedCommentActor,
    page: number,
    limit: number,
  ): Promise<PaginatedFeedCommentsResponseDto> {
    await this.sections.assertFeedSectionVisible(sectionId, true);
    const [rows, total] = await this.repository.findPageBySection(
      sectionId,
      page,
      limit,
    );
    return {
      items: rows.map((row) => FeedCommentResponseDto.fromEntity(row, actor)),
      page,
      limit,
      total,
    };
  }

  /** Contagem em lote para o feed (uma consulta). Só para quem tem sessão. */
  countBySectionIds(sectionIds: string[]): Promise<Map<string, number>> {
    return this.repository.countBySectionIds(sectionIds);
  }
}
