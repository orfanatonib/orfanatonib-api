import { IsString, IsOptional, IsEnum, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { MediaItemDto } from 'src/shared/dto/media-item-dto';
import { AttendableType } from '../entities/attendable-type.enum';

export class UpdateAtendenteDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(AttendableType)
  attendableType?: AttendableType | null;

  @IsOptional()
  @IsString()
  attendableId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => MediaItemDto)
  pdfEstadual?: MediaItemDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MediaItemDto)
  pdfFederal?: MediaItemDto;

  /** Remove o PDF estadual (para poder enviar outro depois). Deve restar pelo menos um PDF. */
  @IsOptional()
  @IsBoolean()
  removePdfEstadual?: boolean;

  /** Remove o PDF federal (para poder enviar outro depois). Deve restar pelo menos um PDF. */
  @IsOptional()
  @IsBoolean()
  removePdfFederal?: boolean;
}
