import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * 📋 DTO para query de sheltered com filtros agrupados logicamente
 */
export class QueryShelteredDto {
  @Transform(({ value }) => Number(value))
  @IsOptional() @IsInt() @Min(1)
  page?: number = 1;

  @Transform(({ value }) => Number(value))
  @IsOptional() @IsInt() @Min(1)
  limit?: number = 20;

  @IsOptional() @IsIn(['name', 'birthDate', 'joinedAt', 'createdAt', 'updatedAt'])
  orderBy?: 'name' | 'birthDate' | 'joinedAt' | 'createdAt' | 'updatedAt' = 'name';

  @IsOptional() @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  order?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'ASC';

  @IsOptional() @IsString()
  searchString?: string;

  // Filtro por ID do abrigo
  @IsOptional() @IsUUID()
  shelterId?: string;
}

export class QueryShelteredSimpleDto {
  @Transform(({ value }) => Number(value))
  @IsOptional() @IsInt() @Min(1)
  page?: number = 1;

  @Transform(({ value }) => Number(value))
  @IsOptional() @IsInt() @Min(1)
  limit?: number = 20;

  @IsOptional() @IsString()
  searchString?: string;

  // ✝️ Filtro: aceitou Jesus
  @IsOptional() @IsIn(['accepted', 'not_accepted', 'all'])
  acceptedJesus?: 'accepted' | 'not_accepted' | 'all' = 'all';

  // ✅ Filtro: status ativo
  // 'active' - apenas abrigados ativos
  // 'inactive' - apenas abrigados inativos
  @IsOptional() @IsIn(['active', 'inactive', 'all'])
  active?: 'active' | 'inactive' | 'all' = 'all';
}