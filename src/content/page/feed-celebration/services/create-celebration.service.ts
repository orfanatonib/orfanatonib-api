import { Injectable } from "@nestjs/common";
import { GetImageSectionService } from "src/content/page/image-section/services/get-image-section.service";
import { ImageSectionCelebrationRepository } from "../repositories/image-section-celebration.repository";
import { isDuplicateEntryError } from "../utils";

@Injectable()
export class CreateCelebrationService {
  constructor(
    private readonly repository: ImageSectionCelebrationRepository,
    private readonly sections: GetImageSectionService,
  ) {}

  /**
   * Celebra a publicação. Idempotente: se a pessoa já celebrou (inclusive numa
   * corrida, quando o índice único recusa o segundo INSERT), nada é duplicado.
   * @returns `true` se uma celebração nova foi gravada.
   */
  async celebrate(sectionId: string, userId: string): Promise<boolean> {
    await this.sections.assertFeedSectionVisible(sectionId, true);
    return this.insertIdempotent(sectionId, userId);
  }

  /** Insere sem checar a seção (quem chama já validou). */
  async insertIdempotent(sectionId: string, userId: string): Promise<boolean> {
    try {
      await this.repository.insertCelebration(sectionId, userId);
      return true;
    } catch (error: unknown) {
      if (isDuplicateEntryError(error)) return false;
      throw error;
    }
  }
}
