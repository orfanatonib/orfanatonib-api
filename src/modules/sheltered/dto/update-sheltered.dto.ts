import {
  IsDateString,
  IsOptional,
  IsString,
  Length,
  IsUUID,
  ValidateNested,
  IsIn,
  ValidateIf,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class AddressUpdateDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  complement?: string;

}

export class UpdateShelteredDto {
  @IsOptional()
  @IsString()
  @Length(2, 255)
  name?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @ValidateIf((o) => o.guardianName && o.guardianName.trim().length > 0)
  @IsString()
  @Length(2, 255)
  guardianName?: string;

  @IsOptional()
  @IsIn(['M', 'F'])
  gender?: string;

  @IsOptional()
  @ValidateIf((o) => o.guardianPhone && o.guardianPhone.trim().length > 0)
  @IsString()
  @Length(5, 32)
  guardianPhone?: string;

  @IsOptional()
  @IsDateString()
  joinedAt?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsUUID()
  shelterId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressUpdateDto)
  address?: AddressUpdateDto | null;
}