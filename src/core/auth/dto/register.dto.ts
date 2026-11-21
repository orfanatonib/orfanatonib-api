import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { GRANTABLE_ROLES, GrantableRole } from "../auth.types";

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim())
  name: string;

  @IsEmail()
  @Transform(({ value }) => String(value).trim().toLowerCase())
  email: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim())
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  /** Só member ou leader: admin nunca é concedido por esta rota. */
  @IsIn(GRANTABLE_ROLES)
  role: GrantableRole;

  @IsOptional()
  @IsString()
  teamId?: string;
}
