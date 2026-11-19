import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import {
  FEED_COMMENT_DEFAULT_PAGE_SIZE,
  FEED_COMMENT_MAX_PAGE_SIZE,
} from "../constants";

export class ListFeedCommentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "page deve ser um inteiro." })
  @Min(1, { message: "page deve ser maior ou igual a 1." })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "limit deve ser um inteiro." })
  @Min(1, { message: "limit deve ser maior ou igual a 1." })
  @Max(FEED_COMMENT_MAX_PAGE_SIZE, {
    message: `limit deve ser no máximo ${FEED_COMMENT_MAX_PAGE_SIZE}.`,
  })
  limit: number = FEED_COMMENT_DEFAULT_PAGE_SIZE;
}
