import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProfilesDto {
  // Paginação
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  // Filtros de busca
  @IsOptional()
  @IsString()
  q?: string; // Busca geral (nome, email)

  @IsOptional()
  @IsString()
  name?: string; // Busca por nome

  @IsOptional()
  @IsString()
  email?: string; // Busca por email

  @IsOptional()
  @IsString()
  @IsIn(['admin', 'teacher', 'leader'])
  role?: string; // Filtro por role

  // Filtros de preferências
  @IsOptional()
  @IsString()
  loveLanguages?: string; // Busca em love languages

  @IsOptional()
  @IsString()
  temperaments?: string; // Busca em temperamentos

  @IsOptional()
  @IsString()
  favoriteColor?: string; // Busca por cor favorita

  // Ordenação
  @IsOptional()
  @IsString()
  @IsIn(['name', 'email', 'createdAt', 'birthDate'])
  sortBy?: string = 'name';

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'ASC';
}
