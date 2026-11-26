import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import {
  VISUAL_INSTRUCTIONS_MAX_LENGTH,
  VISUAL_QUANTITY,
} from "../ai/generation/visual-styles.constants";
import { LessonVisualFormat } from "../ai/generation/visual-art.constants";
import {
  ContentVisualOrientation,
  ContentVisualStyle,
} from "../enums/content-visual.enums";

/** As escolhas do admin para os visuais da lição (as mesmas perguntas do Clubinho). */
export class VisualConfigDto {
  @IsInt()
  @Min(VISUAL_QUANTITY.min)
  @Max(VISUAL_QUANTITY.max)
  quantity: number;

  @IsEnum(LessonVisualFormat)
  format: LessonVisualFormat;

  @IsEnum(ContentVisualStyle)
  style: ContentVisualStyle;

  @IsEnum(ContentVisualOrientation)
  orientation: ContentVisualOrientation;

  /** Orientação extra para as imagens (opcional). */
  @IsOptional()
  @IsString()
  @MaxLength(VISUAL_INSTRUCTIONS_MAX_LENGTH)
  instructions?: string;
}

/** Forma gravada no pedido do job e no conteúdo da etapa. */
export interface VisualConfig {
  readonly quantity: number;
  readonly format: LessonVisualFormat;
  readonly style: ContentVisualStyle;
  readonly orientation: ContentVisualOrientation;
  readonly instructions?: string | null;
}
