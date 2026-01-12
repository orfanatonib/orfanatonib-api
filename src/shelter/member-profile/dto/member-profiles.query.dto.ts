import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const BooleanQuery = () => {
  return Transform(({ value, key, obj }) => {
    const originalValue = obj[key];
    
    if (originalValue === undefined || originalValue === null || originalValue === '') return undefined;
    
    if (typeof originalValue === 'boolean') return originalValue;
    
    const s = String(originalValue).trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(s)) return true;
    if (['false', '0', 'no', 'n'].includes(s)) return false;
    
    return undefined;
  });
};

const toInt = (v: any): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : undefined;
};

const trimOrUndef = (v: any): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t : undefined;
};

export class MemberProfilesQueryDto {
  @IsOptional()
  @Transform(({ value }) => trimOrUndef(value))
  @IsString()
  memberSearchString?: string;

  @IsOptional()
  @Transform(({ value }) => trimOrUndef(value))
  @IsString()
  shelterSearchString?: string;

  @IsOptional()
  @BooleanQuery()
  hasShelter?: boolean;

  @IsOptional()
  @Transform(({ value }) => trimOrUndef(value))
  @IsString()
  teamId?: string;

  @IsOptional()
  @Transform(({ value }) => trimOrUndef(value))
  @IsString()
  teamName?: string;

  @IsOptional()
  @BooleanQuery()
  hasTeam?: boolean;

  @IsOptional()
  @Transform(({ value }) => toInt(value))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => toInt(value))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 12;

  @IsOptional()
  @IsIn(['updatedAt', 'createdAt', 'name'])
  sort: 'updatedAt' | 'createdAt' | 'name' = 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}

export class PageDto<T> {
  items!: T[];
  total!: number;
  page!: number;
  limit!: number;
}
