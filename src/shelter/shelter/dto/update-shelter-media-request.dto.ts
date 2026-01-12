import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { UploadType } from 'src/shared/media/media-item/media-item.entity';

export class UpdateShelterMediaRequestDto {
  @IsOptional()
  @IsString()
  mediaData?: string | {
    title?: string;
    description?: string;
    uploadType?: UploadType;
    url?: string;
    isLocalFile?: boolean;
  };

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(UploadType)
  uploadType?: UploadType;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsBoolean()
  isLocalFile?: boolean;
}

