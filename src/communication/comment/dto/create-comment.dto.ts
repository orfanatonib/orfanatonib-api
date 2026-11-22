import { IsNotEmpty, Matches, MaxLength, IsString } from "class-validator";
import { COMMENT_LIMITS, COMMENT_NON_BLANK_PATTERN } from "../constants";

export class CreateCommentDto {
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
}
