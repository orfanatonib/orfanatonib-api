import { Injectable } from "@nestjs/common";
import {
  ResourceConflictException,
  ResourceNotFoundException,
} from "src/common/exceptions";

import { IDEAS_SECTION_MESSAGES } from "../constants";
import { IdeasSectionRepository } from "../repositories/ideas-section.repository";
import { IdeasSectionMediaService } from "./ideas-section-media.service";

@Injectable()
export class DeleteIdeasSectionService {
  constructor(
    private readonly repository: IdeasSectionRepository,
    private readonly mediaService: IdeasSectionMediaService,
  ) {}

  async execute(id: string): Promise<void> {
    const section = await this.repository.findById(id);
    if (!section) {
      throw new ResourceNotFoundException(
        IDEAS_SECTION_MESSAGES.SECTION_NOT_FOUND,
      );
    }

    // A regra existia, mas a seção era lida sem a relação `page`: o campo
    // vinha sempre indefinido e a guarda nunca disparava — dava para apagar
    // uma seção publicada pela rota de remoção avulsa.
    if (section.page) {
      throw new ResourceConflictException(
        IDEAS_SECTION_MESSAGES.ATTACHED_CANNOT_DELETE,
      );
    }

    await this.mediaService.removeAll(id);
    await this.repository.deleteById(id);
  }
}
