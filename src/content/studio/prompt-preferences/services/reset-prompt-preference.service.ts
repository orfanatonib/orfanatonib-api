import { Injectable } from "@nestjs/common";

import { ContentPromptPreferenceRepository } from "../../repositories/content-prompt-preference.repository";
import type {
  PromptPreferenceResponseDto,
  ResetPromptPreferenceDto,
} from "../dto/prompt-preference.dto";
import { toPromptPreferenceResponse } from "./prompt-preference-view";

@Injectable()
export class ResetPromptPreferenceService {
  constructor(
    private readonly preferences: ContentPromptPreferenceRepository,
  ) {}

  /** Volta a etapa ao padrão oficial. A linha fica (com o texto nulo) para o controle de versão seguir valendo. */
  async execute(
    userId: string,
    dto: ResetPromptPreferenceDto,
  ): Promise<PromptPreferenceResponseDto> {
    const row = await this.preferences.write(
      userId,
      dto.audience,
      dto.stage,
      null,
      dto.lockVersion,
    );
    return toPromptPreferenceResponse(dto.audience, dto.stage, row);
  }
}
