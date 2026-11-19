import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import { AiGenerationCapability } from "../ai/enums/ai-generation-capability.enum";

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
}
