import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

import { VISUAL_INSTRUCTIONS_MAX_LENGTH } from "../ai/generation/visual-styles.constants";

/** Refazer uma ou mais imagens (sem `slots`, refaz todas as que faltam). */
export class RegenerateStageImagesDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Matches(/^[a-z0-9-]{1,40}$/, { each: true })
  slots?: string[];

  /** Orientação extra só para esta nova geração (ex.: "deixe o leão menos assustador"). */
  @IsOptional()
  @IsString()
  @MaxLength(VISUAL_INSTRUCTIONS_MAX_LENGTH)
  instructions?: string;
}
