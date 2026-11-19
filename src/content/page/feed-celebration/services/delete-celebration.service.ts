import { Injectable } from "@nestjs/common";
import { ImageSectionCelebrationRepository } from "../repositories/image-section-celebration.repository";

@Injectable()
export class DeleteCelebrationService {
  constructor(private readonly repository: ImageSectionCelebrationRepository) {}

  /** Descelebra. Idempotente: sem celebração prévia devolve `false`, sem erro. */
  async uncelebrate(sectionId: string, userId: string): Promise<boolean> {
    return (await this.repository.deleteByUser(sectionId, userId)) > 0;
  }
}
