import { IsInt, IsString, IsUUID, Length, Matches, Min } from "class-validator";

export class ApproveReviewStageDto {
  @IsUUID()
  versionId: string;

  @IsInt()
  @Min(1)
  lockVersion: number;

  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/i)
  contentChecksum: string;
}
