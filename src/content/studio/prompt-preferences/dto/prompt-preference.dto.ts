import { Transform } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import { PROMPT_PREFERENCE_MAX_LENGTH } from "../constants";

export class ListPromptPreferencesQueryDto {
  @IsEnum(ContentAudience)
  audience: ContentAudience;
}

export class SavePromptPreferenceDto {
  @IsEnum(ContentAudience)
  audience: ContentAudience;

  @IsEnum(ContentStageType)
  stage: ContentStageType;

  /** Texto vazio é tratado como "voltar ao padrão" pelo serviço de reset; aqui precisa ter conteúdo. */
  @IsString()
  @MaxLength(PROMPT_PREFERENCE_MAX_LENGTH + 2_000)
  customPrompt: string;

  /** Versão que a tela viu; `null`/ausente quando nunca foi salva. */
  @IsOptional()
  @Transform(({ value }) => (value === null ? undefined : value))
  @IsInt()
  @Min(1)
  lockVersion?: number;
}

export class ResetPromptPreferenceDto {
  @IsEnum(ContentAudience)
  audience: ContentAudience;

  @IsEnum(ContentStageType)
  stage: ContentStageType;

  @IsOptional()
  @Transform(({ value }) => (value === null ? undefined : value))
  @IsInt()
  @Min(1)
  lockVersion?: number;
}

export class PromptPreferenceResponseDto {
  stage: ContentStageType;
  basePrompt: string;
  customPrompt: string | null;
  effectivePrompt: string;
  /** `null` enquanto o administrador nunca salvou nem restaurou esta etapa. */
  lockVersion: number | null;
  updatedAt: string | null;
}
