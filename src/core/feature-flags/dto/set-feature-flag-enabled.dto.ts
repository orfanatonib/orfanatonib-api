import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

/** Corpo do `PUT /feature-flags/:key/enabled` (estado desejado, idempotente). */
export class SetFeatureFlagEnabledDto {
  @IsBoolean()
  enabled: boolean;

  /** Versão lida pelo cliente; se a flag já mudou, a resposta é 409. */
  @IsInt()
  @Min(1)
  @IsOptional()
  expectedVersion?: number;
}
