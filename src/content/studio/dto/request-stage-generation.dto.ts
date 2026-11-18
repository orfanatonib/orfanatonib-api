import { IsEnum, IsNotEmpty, IsString, MaxLength } from "class-validator";

import { AiGenerationCapability } from "../ai/enums/ai-generation-capability.enum";

export class RequestStageGenerationDto {
  @IsEnum(AiGenerationCapability)
  capability: AiGenerationCapability;

  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  idempotencyKey: string;
}
