import { IsOptional, IsString, IsEnum } from 'class-validator';
import { TestamentType } from '../entities/visit-material-page.entity';

/**
 * 📋 DTO para query de visit-material-pages com filtros
 */
export class QueryVisitMaterialsPageDto {
  // 🔍 Filtro por testamento
  @IsOptional()
  @IsEnum(TestamentType)
  testament?: TestamentType;

  // 🔍 Busca unificada: title, subtitle, description
  @IsOptional()
  @IsString()
  searchString?: string;
}

