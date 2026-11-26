import { AUDIENCE_PROFILES } from "../../ai/generation/audience-profiles.constants";
import { stageBasePrompt } from "../../ai/generation/stage-prompts.constants";
import type { ContentPromptPreferenceEntity } from "../../entities/content-prompt-preference.entity";
import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import type { PromptPreferenceResponseDto } from "../dto/prompt-preference.dto";
import { effectivePrompt } from "../utils/prompt-preference.utils";

/** Resposta de uma etapa: regras oficiais do público + a orientação do administrador (se houver). */
export function toPromptPreferenceResponse(
  audience: ContentAudience,
  stage: ContentStageType,
  row: ContentPromptPreferenceEntity | undefined | null,
): PromptPreferenceResponseDto {
  const basePrompt = stageBasePrompt(stage, AUDIENCE_PROFILES[audience]);
  const customPrompt = row?.customPrompt?.trim() ? row.customPrompt : null;
  return {
    stage,
    basePrompt,
    customPrompt,
    effectivePrompt: effectivePrompt(basePrompt, customPrompt),
    lockVersion: row?.lockVersion ?? null,
    updatedAt: row ? row.updatedAt.toISOString() : null,
  };
}
