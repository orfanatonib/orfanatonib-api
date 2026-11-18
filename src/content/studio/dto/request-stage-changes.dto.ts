import { Transform } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Length, Matches, MaxLength, Min } from "class-validator";

export class RequestStageChangesDto {
  @IsUUID()
  versionId: string;

  @IsInt()
  @Min(1)
  lockVersion: number;

  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/i)
  contentChecksum: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  blockKey?: string | null;

  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;
}
