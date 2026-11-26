import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { ReadFilterQueryDto } from "src/shared/list-query/read-filter-query.dto";
import { FeedbackCategory } from "../entity/feedback-category.enum";
import { SiteFeedbackSortBy } from "../enums/site-feedback-sort-by.enum";

export const FEEDBACK_MIN_RATING = 1;
export const FEEDBACK_MAX_RATING = 5;

/** Filtros de `GET /site-feedbacks`: busca, lido, tipo (categoria), nota, datas, ordenação e página. */
export class QuerySiteFeedbackDto extends ReadFilterQueryDto {
  @IsOptional()
  @IsEnum(FeedbackCategory, { message: "category inválida" })
  category?: FeedbackCategory;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "rating deve ser um inteiro" })
  @Min(FEEDBACK_MIN_RATING, { message: "rating deve ser de 1 a 5" })
  @Max(FEEDBACK_MAX_RATING, { message: "rating deve ser de 1 a 5" })
  rating?: number;

  @IsOptional()
  @IsEnum(SiteFeedbackSortBy, {
    message: "sortBy deve ser createdAt, rating ou name",
  })
  sortBy?: SiteFeedbackSortBy;
}
