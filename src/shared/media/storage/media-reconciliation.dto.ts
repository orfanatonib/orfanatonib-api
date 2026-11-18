import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

/**
 * Lê o valor ORIGINAL da query: com `enableImplicitConversion` o pipe global já
 * converteu "false" em `true` (Boolean("false")) antes deste Transform rodar.
 */
const toBoolean = ({
  obj,
  key,
}: {
  obj: Record<string, unknown>;
  key: string;
}): unknown => {
  const raw = obj[key];
  if (raw === "false" || raw === false) return false;
  if (raw === "true" || raw === true) return true;
  return raw;
};

/** `dryRun` é verdadeiro por padrão: apagar é sempre uma decisão explícita. */
export class ReconcileMediaQueryDto {
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  dryRun?: boolean;

  /** Idade mínima (horas) de um órfão para ser removido. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? Number(value) : value,
  )
  @IsInt()
  @Min(0)
  @Max(720)
  minAgeHours?: number;
}
