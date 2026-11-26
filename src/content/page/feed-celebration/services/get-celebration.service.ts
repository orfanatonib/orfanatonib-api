import { Injectable } from "@nestjs/common";
import { GetImageSectionService } from "src/content/page/image-section/services/get-image-section.service";
import { ImageSectionCelebrationRepository } from "../repositories/image-section-celebration.repository";
import { CelebrationStateResponseDto } from "../dto/celebration-state-response.dto";
import { CelebrationSummary } from "../types";

@Injectable()
export class GetCelebrationService {
  constructor(
    private readonly repository: ImageSectionCelebrationRepository,
    private readonly sections: GetImageSectionService,
  ) {}

  /** Contagem + estado de quem pergunta (`userId` nulo = visitante). */
  async getState(
    sectionId: string,
    userId: string | null,
  ): Promise<CelebrationStateResponseDto> {
    await this.sections.assertFeedSectionVisible(sectionId, userId !== null);
    const [count, celebratedByMe] = await Promise.all([
      this.repository.countBySection(sectionId),
      userId ? this.repository.existsByUser(sectionId, userId) : false,
    ]);
    return { sectionId, count, celebratedByMe };
  }

  /** Resumo em lote para o feed (2 consultas, sem N+1). */
  async summarize(
    sectionIds: string[],
    userId: string | null,
  ): Promise<Map<string, CelebrationSummary>> {
    const [counts, mine] = await Promise.all([
      this.repository.countBySectionIds(sectionIds),
      userId
        ? this.repository.findCelebratedSectionIds(userId, sectionIds)
        : Promise.resolve(new Set<string>()),
    ]);
    const summary = new Map<string, CelebrationSummary>();
    for (const id of sectionIds) {
      summary.set(id, {
        count: counts.get(id) ?? 0,
        celebratedByMe: mine.has(id),
      });
    }
    return summary;
  }
}
