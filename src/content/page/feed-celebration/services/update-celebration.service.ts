import { Injectable } from "@nestjs/common";
import { GetImageSectionService } from "src/content/page/image-section/services/get-image-section.service";
import { CelebrationStateResponseDto } from "../dto/celebration-state-response.dto";
import { CreateCelebrationService } from "./create-celebration.service";
import { DeleteCelebrationService } from "./delete-celebration.service";
import { GetCelebrationService } from "./get-celebration.service";

@Injectable()
export class UpdateCelebrationService {
  constructor(
    private readonly sections: GetImageSectionService,
    private readonly createService: CreateCelebrationService,
    private readonly deleteService: DeleteCelebrationService,
    private readonly getService: GetCelebrationService,
  ) {}

  /**
   * Alterna: remove a celebração se existe; senão grava. Duas chamadas
   * concorrentes nunca geram 500 nem duplicata (o INSERT duplicado é absorvido).
   */
  async toggle(
    sectionId: string,
    userId: string,
  ): Promise<CelebrationStateResponseDto> {
    await this.sections.assertFeedSectionVisible(sectionId, true);
    const removed = await this.deleteService.uncelebrate(sectionId, userId);
    if (!removed) await this.createService.insertIdempotent(sectionId, userId);
    return this.getService.getState(sectionId, userId);
  }
}
