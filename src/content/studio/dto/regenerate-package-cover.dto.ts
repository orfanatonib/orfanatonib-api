import { IsOptional, IsString, MaxLength } from "class-validator";

export class RegeneratePackageCoverDto {
  /** Orientação extra para o desenho (ex.: "o personagem com o cajado na mão"). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  instructions?: string;
}
