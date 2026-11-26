import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  MaxLength,
  Matches,
} from "class-validator";
import { StrictBoolean } from "src/common/decorators/strict-boolean.decorator";
import {
  INFORMATIVE_LIMITS,
  INFORMATIVE_NON_BLANK_PATTERN,
} from "../constants";

export class CreateInformativeDto {
  @IsString()
  @IsNotEmpty({ message: "O título é obrigatório." })
  @Matches(INFORMATIVE_NON_BLANK_PATTERN, {
    message: "O título não pode conter apenas espaços.",
  })
  @MaxLength(INFORMATIVE_LIMITS.titleMax)
  title: string;

  @IsString()
  @IsNotEmpty({ message: "A descrição é obrigatória." })
  @Matches(INFORMATIVE_NON_BLANK_PATTERN, {
    message: "A descrição não pode conter apenas espaços.",
  })
  description: string;

  @StrictBoolean()
  @IsBoolean()
  public: boolean;
}
