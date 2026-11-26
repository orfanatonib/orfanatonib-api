import { Type } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

import { AiGenerationCapability } from "../ai/enums/ai-generation-capability.enum";
import { VisualConfigDto } from "./visual-config.dto";

export class RequestStageGenerationDto {
  @IsEnum(AiGenerationCapability)
  capability: AiGenerationCapability;

  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  idempotencyKey: string;

  /**
   * Instruções do administrador para ESTA geração (ênfase, exemplos, tom). Acrescentam ao
   * prompt-base, nunca removem campos nem o cuidado com o público.
   */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  revisionInstructions?: string;

  /** Escolhas dos visuais (obrigatório na etapa "Visuais da lição"): quantidade, tipo, desenho e formato. */
  @IsOptional()
  @ValidateNested()
  @Type(() => VisualConfigDto)
  visualConfig?: VisualConfigDto;
}
