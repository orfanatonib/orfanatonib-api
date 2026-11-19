import { Injectable } from "@nestjs/common";
import { GetImageSectionService } from "src/content/page/image-section/services/get-image-section.service";
import { ImageSectionCommentRepository } from "../repositories/image-section-comment.repository";
import {
  FeedCommentPendingCountResponseDto,
  FeedCommentResponseDto,
  ModerationFeedCommentResponseDto,
  PaginatedFeedCommentsResponseDto,
  PaginatedModerationFeedCommentsResponseDto,
} from "../dto/feed-comment-response.dto";
import { ModerationFeedCommentsQueryDto } from "../dto/moderation-feed-comments-query.dto";
import { FeedCommentActor } from "../types";

@Injectable()
export class GetFeedCommentService {
  constructor(
    private readonly repository: ImageSectionCommentRepository,
    private readonly sections: GetImageSectionService,
  ) {}

  /** O que todos veem: só comentários APROVADOS. */
  async list(
    sectionId: string,
    actor: FeedCommentActor,
    page: number,
    limit: number,
  ): Promise<PaginatedFeedCommentsResponseDto> {
    await this.sections.assertFeedSectionVisible(sectionId, true);
    const [rows, total] = await this.repository.findApprovedPageBySection(
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

  /** O que o autor enviou na publicação, em qualquer status (com o motivo se reprovado). */
  async listMine(
    sectionId: string,
    actor: FeedCommentActor,
    page: number,
    limit: number,
  ): Promise<PaginatedFeedCommentsResponseDto> {
    await this.sections.assertFeedSectionVisible(sectionId, true);
    const [rows, total] = await this.repository.findMinePageBySection(
      sectionId,
      actor.userId,
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

  /** Fila de moderação (admin): paginada, com publicação de contexto. */
  async listModeration(
    query: ModerationFeedCommentsQueryDto,
    actor: FeedCommentActor,
  ): Promise<PaginatedModerationFeedCommentsResponseDto> {
    const [[rows, total], counts] = await Promise.all([
      this.repository.findModerationPage(
        query.page,
        query.limit,
        query.status,
        query.search,
      ),
      this.repository.countByStatus(),
    ]);
    const contexts = await this.sections.findFeedContexts([
      ...new Set(rows.map((row) => row.sectionId)),
    ]);
    const items: ModerationFeedCommentResponseDto[] = rows.map((row) =>
      ModerationFeedCommentResponseDto.fromModeration(
        row,
        actor,
        contexts.get(row.sectionId) ?? null,
      ),
    );
    return { items, counts, page: query.page, limit: query.limit, total };
  }

  async pendingCount(): Promise<FeedCommentPendingCountResponseDto> {
    return { pending: await this.repository.countPending() };
  }

  /** Contagem em lote para o feed: só comentários aprovados. */
  countBySectionIds(sectionIds: string[]): Promise<Map<string, number>> {
    return this.repository.countApprovedBySectionIds(sectionIds);
  }
}
