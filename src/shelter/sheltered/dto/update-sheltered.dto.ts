import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { UpdateShelteredAddressDto } from "./sheltered-address.dto";
import { ShelteredGender } from "../enums/sheltered-gender.enum";
import {
  GUARDIAN_NAME_MAX_LENGTH,
  GUARDIAN_NAME_MIN_LENGTH,
  GUARDIAN_PHONE_MAX_LENGTH,
  GUARDIAN_PHONE_MIN_LENGTH,
  SHELTERED_NAME_MAX_LENGTH,
  SHELTERED_NAME_MIN_LENGTH,
} from "../constants";

/**
 * Every field is optional: an omitted key leaves the column untouched, while an
 * explicit `null` on `shelterId`/`address` detaches the relation.
 */
export class UpdateShelteredDto {
  @IsOptional()
  @IsString()
  @Length(SHELTERED_NAME_MIN_LENGTH, SHELTERED_NAME_MAX_LENGTH)
  name?: string;

  @IsOptional()
  @IsEnum(ShelteredGender)
  gender?: ShelteredGender;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @ValidateIf((dto: UpdateShelteredDto) => Boolean(dto.guardianName?.trim()))
  @IsString()
  @Length(GUARDIAN_NAME_MIN_LENGTH, GUARDIAN_NAME_MAX_LENGTH)
  guardianName?: string;

  @IsOptional()
  @ValidateIf((dto: UpdateShelteredDto) => Boolean(dto.guardianPhone?.trim()))
  @IsString()
  @Length(GUARDIAN_PHONE_MIN_LENGTH, GUARDIAN_PHONE_MAX_LENGTH)
  guardianPhone?: string;

  @IsOptional()
  @IsDateString()
  joinedAt?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @ValidateIf((_dto: UpdateShelteredDto, value: unknown) => value !== null)
  @IsUUID()
  shelterId?: string | null;

  @IsOptional()
  @ValidateIf((_dto: UpdateShelteredDto, value: unknown) => value !== null)
  @ValidateNested()
  @Type(() => UpdateShelteredAddressDto)
  address?: UpdateShelteredAddressDto | null;
}
