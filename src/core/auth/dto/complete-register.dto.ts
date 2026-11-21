import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { GRANTABLE_ROLES, GrantableRole } from "../auth.types";

export class CompleteUserDto {
  /** Prova de posse da conta Google, devolvida por `POST /auth/google`. */
  @IsString()
  @IsNotEmpty()
  completionToken: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsIn(GRANTABLE_ROLES)
  role?: GrantableRole;

  @IsOptional()
  @IsString()
  teamId?: string;
}
