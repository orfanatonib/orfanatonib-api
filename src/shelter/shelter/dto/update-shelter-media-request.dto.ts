import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { UploadType } from 'src/shared/media/media-item/media-item.entity';

/**
 * DTO para receber dados de atualização de mídia de abrigo via form-data ou JSON
 * 
 * Pode receber:
 * - mediaData: string JSON (quando vem como form-data)
 * - Campos diretos (title, url, etc.) quando vem como JSON puro
 * 
 * A validação e transformação são feitas no service
 */
export class UpdateShelterMediaRequestDto {
  /**
   * Quando vem como form-data, os dados da mídia vêm como string JSON neste campo
   */
  @IsOptional()
  @IsString()
  mediaData?: string | {
    title?: string;
    description?: string;
    uploadType?: UploadType;
    url?: string;
    isLocalFile?: boolean;
  };

  /**
   * Campos diretos (usado quando vem como JSON puro ou form-data com campos separados)
   */
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

