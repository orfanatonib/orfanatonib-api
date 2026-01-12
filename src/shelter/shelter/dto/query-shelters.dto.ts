import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, IsString, IsIn } from 'class-validator';

export class QuerySheltersDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number = 10;

  @IsOptional() @IsIn(['name', 'createdAt', 'updatedAt', 'city', 'state'])
  sort?: 'name' | 'createdAt' | 'updatedAt' | 'city' | 'state' = 'name';

  @IsOptional() @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  order?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'ASC';

  @IsOptional() @IsString()
  searchString?: string;

  @IsOptional() @IsString()
  shelterName?: string;
}
