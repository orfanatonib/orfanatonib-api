import { Injectable } from "@nestjs/common";

import { RuleException } from "src/common/exceptions";
import { ContentPromptPreferenceRepository } from "../../repositories/content-prompt-preference.repository";
import type {
  PromptPreferenceResponseDto,
  SavePromptPreferenceDto,
} from "../dto/prompt-preference.dto";
import {
  PROMPT_PROBLEM_MESSAGES,
  validatePromptPreference,
} from "../utils/prompt-preference.utils";
import { toPromptPreferenceResponse } from "./prompt-preference-view";

@Injectable()
export class SavePromptPreferenceService {
  constructor(
    private readonly preferences: ContentPromptPreferenceRepository,
  ) {}

  async execute(
    userId: string,
    dto: SavePromptPreferenceDto,
  ): Promise<PromptPreferenceResponseDto> {
    const problem = validatePromptPreference(dto.customPrompt);
    if (problem)
      throw new RuleException(PROMPT_PROBLEM_MESSAGES[problem], {
        field: "customPrompt",
        problem,
      });
    const row = await this.preferences.write(
      userId,
      dto.audience,
      dto.stage,
      dto.customPrompt.trim(),
      dto.lockVersion,
    );
    return toPromptPreferenceResponse(dto.audience, dto.stage, row);
  }
}
