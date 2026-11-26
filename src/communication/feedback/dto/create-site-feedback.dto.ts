import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsEmail,
  IsNotEmpty,
  Max,
  MaxLength,
  Min,
  Matches,
} from "class-validator";
import { FeedbackCategory } from "../entity/feedback-category.enum";
import {
  SITE_FEEDBACK_LIMITS,
  SITE_FEEDBACK_NON_BLANK_PATTERN,
} from "../constants";

export class CreateSiteFeedbackDto {
  @IsString({ message: "name deve ser uma string" })
  @IsNotEmpty()
  @Matches(SITE_FEEDBACK_NON_BLANK_PATTERN, {
    message: "name não pode conter apenas espaços",
  })
  @MaxLength(SITE_FEEDBACK_LIMITS.nameMax)
  name: string;

  @IsOptional()
  @IsEmail({}, { message: "email inválido" })
  @MaxLength(SITE_FEEDBACK_LIMITS.emailMax)
  email?: string;

  @IsInt({ message: "rating deve ser um número inteiro" })
  @Min(SITE_FEEDBACK_LIMITS.ratingMin, { message: "rating deve ser de 1 a 5" })
  @Max(SITE_FEEDBACK_LIMITS.ratingMax, { message: "rating deve ser de 1 a 5" })
  rating: number;

  @IsString({ message: "comment deve ser uma string" })
  @IsNotEmpty()
  @Matches(SITE_FEEDBACK_NON_BLANK_PATTERN, {
    message: "comment não pode conter apenas espaços",
  })
  @MaxLength(SITE_FEEDBACK_LIMITS.commentMax)
  comment: string;

  @IsEnum(FeedbackCategory, { message: "category inválida" })
  category: FeedbackCategory;
}
