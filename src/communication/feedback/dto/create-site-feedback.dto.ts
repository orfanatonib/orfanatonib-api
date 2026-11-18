import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsEmail,
  IsNotEmpty,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { FeedbackCategory } from "../entity/feedback-category.enum";

export class CreateSiteFeedbackDto {
  @IsString({ message: "name deve ser uma string" })
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsEmail({}, { message: "email inválido" })
  @MaxLength(255)
  email?: string;

  @IsNumber({}, { message: "rating deve ser um number" })
  @Min(1, { message: "rating deve ser de 1 a 5" })
  @Max(5, { message: "rating deve ser de 1 a 5" })
  rating: number;

  @IsString({ message: "comment deve ser uma string" })
  @IsNotEmpty()
  @MaxLength(5000)
  comment: string;

  @IsEnum(FeedbackCategory, { message: "category inválida" })
  category: FeedbackCategory;
}
