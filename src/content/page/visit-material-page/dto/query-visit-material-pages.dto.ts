import { IsOptional, IsString, IsEnum } from 'class-validator';
import { TestamentType } from '../entities/visit-material-page.entity';

export class QueryVisitMaterialsPageDto {
  @IsOptional()
  @IsEnum(TestamentType)
  testament?: TestamentType;

  @IsOptional()
  @IsString()
  searchString?: string;
}
