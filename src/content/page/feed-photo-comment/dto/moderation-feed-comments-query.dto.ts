import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
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
}
