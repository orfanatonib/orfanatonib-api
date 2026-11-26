import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  MaxLength,
  Matches,
} from "class-validator";
import { StrictBoolean } from "src/common/decorators/strict-boolean.decorator";
import {
  INFORMATIVE_LIMITS,
  INFORMATIVE_NON_BLANK_PATTERN,
} from "../constants";

export class UpdateInformativeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "O título é obrigatório." })
  @Matches(INFORMATIVE_NON_BLANK_PATTERN, {
    message: "O título não pode conter apenas espaços.",
  })
  @MaxLength(INFORMATIVE_LIMITS.titleMax)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "A descrição é obrigatória." })
  @Matches(INFORMATIVE_NON_BLANK_PATTERN, {
    message: "A descrição não pode conter apenas espaços.",
  })
  description?: string;

  @IsOptional()
  @StrictBoolean()
  @IsBoolean()
  public?: boolean;
}
