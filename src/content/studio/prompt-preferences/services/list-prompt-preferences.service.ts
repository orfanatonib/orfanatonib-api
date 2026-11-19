import { Injectable } from "@nestjs/common";

import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import { ContentPromptPreferenceRepository } from "../../repositories/content-prompt-preference.repository";
import type { PromptPreferenceResponseDto } from "../dto/prompt-preference.dto";
import { toPromptPreferenceResponse } from "./prompt-preference-view";

@Injectable()
export class ListPromptPreferencesService {
  constructor(
    private readonly preferences: ContentPromptPreferenceRepository,
  ) {}

  /** As etapas do público, na ordem de produção, cada uma com o que este administrador personalizou. */
  async execute(
    userId: string,
    audience: ContentAudience,
  ): Promise<PromptPreferenceResponseDto[]> {
    const rows = await this.preferences.findForUser(userId, audience);
    return Object.values(ContentStageType).map((stage) =>
      toPromptPreferenceResponse(
        audience,
        stage,
        rows.find((row) => row.stageType === stage),
      ),
    );
  }
}
