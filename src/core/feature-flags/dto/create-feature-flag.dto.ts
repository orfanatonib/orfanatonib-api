import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

import { UserRole } from "src/core/auth/auth.types";

const FEATURE_FLAG_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export class CreateFeatureFlagDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.toLowerCase().trim() : value,
  )
  @IsString()
  @MaxLength(255)
  @Matches(FEATURE_FLAG_KEY_PATTERN, {
    message:
      'A chave deve conter apenas letras minúsculas, números, "_" e "-", começando por letra ou número.',
  })
  key: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  environment?: string;

  @IsArray()
  @IsEnum(UserRole, {
    each: true,
    message: 'Cada perfil deve ser "admin", "leader" ou "member".',
  })
  @IsOptional()
  targetRoles?: UserRole[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown> | null;
}
