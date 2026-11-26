import { Transform } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { FeedCommentSortBy } from "../enums/feed-comment-sort-by.enum";
import { FEED_COMMENT_SEARCH_MAX_LENGTH } from "../constants";
import { FeedCommentStatus } from "../enums/feed-comment-status.enum";
import { trimText } from "../utils";
import { ListFeedCommentsQueryDto } from "./list-feed-comments-query.dto";

/** Fila do admin: paginada, com filtro por status e busca por autor/texto/publicação. */
export class ModerationFeedCommentsQueryDto extends ListFeedCommentsQueryDto {
  @IsOptional()
  @IsEnum(FeedCommentStatus, { message: "status inválido." })
  status?: FeedCommentStatus;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(FEED_COMMENT_SEARCH_MAX_LENGTH)
  search?: string;

  /** Início do intervalo de criação (inclusivo), `AAAA-MM-DD`. */
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: "createdFrom deve ser AAAA-MM-DD" },
  )
  createdFrom?: string;

  /** Fim do intervalo de criação (inclusivo, dia inteiro), `AAAA-MM-DD`. */
  @IsOptional()
  @IsDateString({ strict: true }, { message: "createdTo deve ser AAAA-MM-DD" })
  createdTo?: string;

  @IsOptional()
  @IsEnum(FeedCommentSortBy, {
    message: "sortBy deve ser createdAt ou reviewedAt",
  })
  sortBy?: FeedCommentSortBy;

  @IsOptional()
  @IsEnum(SortOrder, { message: "order deve ser ASC ou DESC" })
  order?: SortOrder;
}
