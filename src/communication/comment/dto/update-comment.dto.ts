import {
  IsBoolean,
  IsNotEmpty,
  Matches,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { StrictBoolean } from "src/common/decorators/strict-boolean.decorator";
import { COMMENT_LIMITS, COMMENT_NON_BLANK_PATTERN } from "../constants";

export class UpdateCommentDto {
  @IsString({ message: "name deve ser uma string" })
  @IsNotEmpty()
  @Matches(COMMENT_NON_BLANK_PATTERN, {
    message: "name não pode conter apenas espaços",
  })
  @MaxLength(COMMENT_LIMITS.nameMax)
  name: string;

  @IsString({ message: "comment deve ser uma string" })
  @IsNotEmpty()
  @Matches(COMMENT_NON_BLANK_PATTERN, {
    message: "comment não pode conter apenas espaços",
  })
  @MaxLength(COMMENT_LIMITS.commentMax)
  comment: string;

  @IsString({ message: "shelter deve ser uma string" })
  @IsNotEmpty()
  @Matches(COMMENT_NON_BLANK_PATTERN, {
    message: "shelter não pode conter apenas espaços",
  })
  @MaxLength(COMMENT_LIMITS.shelterMax)
  shelter: string;

  @IsString({ message: "neighborhood deve ser uma string" })
  @IsNotEmpty()
  @Matches(COMMENT_NON_BLANK_PATTERN, {
    message: "neighborhood não pode conter apenas espaços",
  })
  @MaxLength(COMMENT_LIMITS.neighborhoodMax)
  neighborhood: string;

  @IsOptional()
  @StrictBoolean()
  @IsBoolean({ message: "published deve ser uma boolean" })
  published?: boolean;
}
