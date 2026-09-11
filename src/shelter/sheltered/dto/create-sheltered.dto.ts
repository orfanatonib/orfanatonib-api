import {
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
import { CreateShelteredAddressDto } from "./sheltered-address.dto";
import { ShelteredGender } from "../enums/sheltered-gender.enum";
import {
  GUARDIAN_NAME_MAX_LENGTH,
  GUARDIAN_NAME_MIN_LENGTH,
  GUARDIAN_PHONE_MAX_LENGTH,
  GUARDIAN_PHONE_MIN_LENGTH,
  SHELTERED_NAME_MAX_LENGTH,
  SHELTERED_NAME_MIN_LENGTH,
} from "../constants";

export class CreateShelteredDto {
  @IsString()
  @Length(SHELTERED_NAME_MIN_LENGTH, SHELTERED_NAME_MAX_LENGTH)
  name: string;

  @IsEnum(ShelteredGender)
  gender: ShelteredGender;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @ValidateIf((dto: CreateShelteredDto) => Boolean(dto.guardianName?.trim()))
  @IsString()
  @Length(GUARDIAN_NAME_MIN_LENGTH, GUARDIAN_NAME_MAX_LENGTH)
  guardianName?: string;

  @IsOptional()
  @ValidateIf((dto: CreateShelteredDto) => Boolean(dto.guardianPhone?.trim()))
  @IsString()
  @Length(GUARDIAN_PHONE_MIN_LENGTH, GUARDIAN_PHONE_MAX_LENGTH)
  guardianPhone?: string;

  @IsOptional()
  @IsDateString()
  joinedAt?: string;

  @IsOptional()
  @IsUUID()
  shelterId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateShelteredAddressDto)
  address?: CreateShelteredAddressDto;
}
