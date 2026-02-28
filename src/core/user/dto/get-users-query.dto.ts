import { IsInt, IsOptional, IsString, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetUsersQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit = 12;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['user', 'admin', 'leader', 'member'])
  role?: 'user' | 'admin' | 'leader' | 'member';

  @IsOptional()
  @IsIn(['all', 'active', 'inactive'])
  active?: 'all' | 'active' | 'inactive';

  @IsOptional()
  @IsIn(['all', 'completed', 'incomplete'])
  completed?: 'all' | 'completed' | 'incomplete';

  @IsOptional()
  @IsIn(['name', 'email', 'phone', 'role', 'createdAt', 'updatedAt'])
  sort: string = 'updatedAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  order: 'ASC' | 'DESC' | 'asc' | 'desc' = 'DESC';
}
