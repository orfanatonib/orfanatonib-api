import { Transform } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import {
  LESSON_EDITORIAL_PURPOSE_MAX_LENGTH,
  LESSON_EDITORIAL_PURPOSE_MIN_LENGTH,
  LESSON_WEEK_NUMBER,
} from "../constants/lesson-workflow.constants";
import { LessonCategory } from "../enums/lesson.enums";

export class GenerateLessonRequestDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  theme: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  biblicalReference: string;

  @IsOptional()
  @IsEnum(LessonCategory)
  category?: LessonCategory;

  // Semana da visita: obrigatória para todos os públicos.
  @IsInt()
  @Min(LESSON_WEEK_NUMBER.MIN)
  @Max(LESSON_WEEK_NUMBER.MAX)
  weekNumber: number;

  // Obrigatório em todos os públicos: o propósito que a lição deve ensinar.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(LESSON_EDITORIAL_PURPOSE_MIN_LENGTH)
  @MaxLength(LESSON_EDITORIAL_PURPOSE_MAX_LENGTH)
  editorialPurpose: string;
}
