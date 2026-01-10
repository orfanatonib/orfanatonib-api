import {
  IsOptional,
  IsUUID,
  ValidateNested,
  IsString,
  IsArray,
  ArrayUnique,
  Length,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { UploadType, PlatformType } from 'src/shared/media/media-item/media-item.entity';

export class AddressInputDto {
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() number?: string;
  @IsOptional() @IsString() district?: string;
  @IsString() city!: string;
  @IsString() state!: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() complement?: string;
}

export class MediaItemInputDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional()
  @IsEnum(UploadType)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      return normalized === 'upload' ? UploadType.UPLOAD : normalized === 'link' ? UploadType.LINK : value;
    }
    return value;
  })
  uploadType?: UploadType;
  @IsOptional() @IsEnum(PlatformType) platformType?: PlatformType;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsBoolean() isLocalFile?: boolean;
  @IsOptional() @IsString() originalName?: string;
  @IsOptional() @IsNumber() size?: number;
  @IsOptional() @IsString() fieldKey?: string;
}

export class TeamInputDto {
  @IsNumber()
  @Min(1)
  numberTeam!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  leaderProfileIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  teacherProfileIds?: string[];
}

export class CreateShelterDto {
  @IsString() @Length(2, 255)
  name!: string;

  @IsOptional() @IsString()
  description?: string;

  @IsNumber() @IsNumber({}, { message: 'teamsQuantity deve ser um número' })
  @Min(1)
  teamsQuantity!: number;

  @ValidateNested()
  @Type(() => AddressInputDto)
  address!: AddressInputDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamInputDto)
  teams?: TeamInputDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => MediaItemInputDto)
  mediaItem?: MediaItemInputDto;
}
