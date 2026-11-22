import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { StrictBoolean } from "src/common/decorators/strict-boolean.decorator";
import { UserRole } from "src/core/auth/auth.types";

export class CreateUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @MinLength(6)
  password!: string;

  @IsString()
  phone!: string;

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
