import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateContentPackageDto {
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
