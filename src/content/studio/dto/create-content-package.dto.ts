import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import { ContentAudience } from "../enums/content-audience.enum";

export class CreateContentPackageDto {
  @IsOptional()
  @IsEnum(ContentAudience)
  audience?: ContentAudience;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  theme: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  biblicalReferences: string;

  @IsString()
  @IsNotEmpty()
  canonicalObjective: string;

  @IsOptional()
  @IsString()
  canonicalNotes?: string | null;
}
