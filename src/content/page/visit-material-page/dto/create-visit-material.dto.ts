import {
  IsArray,
  IsOptional,
  IsString,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MediaItemDto } from 'src/shared/dto/media-item-dto';
import { TestamentType } from '../entities/visit-material-page.entity';

export class CreateVisitMaterialsPageDto {
  @IsString({ message: 'O campo "pageTitle" deve ser uma string.' })
  pageTitle: string;

  @IsString({ message: 'O campo "pageSubtitle" deve ser uma string.' })
  pageSubtitle: string;

  @IsOptional()
  @IsEnum(TestamentType, { message: 'O campo "testament" deve ser OLD_TESTAMENT ou NEW_TESTAMENT.' })
  testament?: TestamentType;

  @IsString({ message: 'O campo "pageDescription" deve ser uma string.' })
  pageDescription: string;

  @IsOptional()
  @IsArray({ message: 'O campo "videos" deve ser um array.' })
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  videos?: MediaItemDto[];

  @IsOptional()
  @IsArray({ message: 'O campo "documents" deve ser um array.' })
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  documents?: MediaItemDto[];

  @IsOptional()
  @IsArray({ message: 'O campo "images" deve ser um array.' })
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  images?: MediaItemDto[];

  @IsOptional()
  @IsArray({ message: 'O campo "audios" deve ser um array.' })
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  audios?: MediaItemDto[];
}

