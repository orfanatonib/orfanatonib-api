import { IsString, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MediaItemDto } from 'src/shared/dto/media-item-dto';
import { AttendableType } from '../entities/attendable-type.enum';

export class CreateAtendenteDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(AttendableType)
  attendableType?: AttendableType | null;

  @IsOptional()
  @IsString()
  attendableId?: string | null;

  @ValidateNested()
  @Type(() => MediaItemDto)
  pdf: MediaItemDto;
}
