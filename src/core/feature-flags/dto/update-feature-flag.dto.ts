import { PartialType } from "@nestjs/mapped-types";
import { IsInt, IsOptional, Min } from "class-validator";

import { CreateFeatureFlagDto } from "./create-feature-flag.dto";

export class UpdateFeatureFlagDto extends PartialType(CreateFeatureFlagDto) {
  /** Versão lida pelo cliente; se a flag já mudou, a resposta é 409. */
  @IsInt()
  @Min(1)
  @IsOptional()
  expectedVersion?: number;
}
