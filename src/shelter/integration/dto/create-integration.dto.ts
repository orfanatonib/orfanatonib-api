import { IsString, IsBoolean, IsInt, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

class MediaItemDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    url?: string;

    @IsOptional()
    @IsString()
    fieldKey?: string;

    @IsOptional()
    isLocalFile?: boolean;
}

export class CreateIntegrationDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    gaLeader?: string;

    @IsOptional()
    @IsBoolean()
    baptized?: boolean;

    @IsOptional()
    @IsInt()
    churchYears?: number;

    @IsOptional()
    @IsString()
    previousMinistry?: string;

    @IsOptional()
    @IsInt()
    integrationYear?: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MediaItemDto)
    images?: MediaItemDto[];
}
