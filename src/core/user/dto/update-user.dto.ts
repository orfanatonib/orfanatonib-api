import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
} from "class-validator";
import { StrictBoolean } from "src/common/decorators/strict-boolean.decorator";
import { UserRole } from "src/core/auth/auth.types";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @StrictBoolean()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @StrictBoolean()
  @IsBoolean()
  commonUser?: boolean;

  @IsOptional()
  @StrictBoolean()
  @IsBoolean()
  active?: boolean;
}
