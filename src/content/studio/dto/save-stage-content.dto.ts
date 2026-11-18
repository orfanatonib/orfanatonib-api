import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class SaveStageContentDto {
  @IsObject()
  structuredContent: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  templateVersion?: string;
}
