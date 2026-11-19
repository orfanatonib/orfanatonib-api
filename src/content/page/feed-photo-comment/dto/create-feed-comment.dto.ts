import { IsString, MaxLength } from "class-validator";
import { FEED_COMMENT_MAX_LENGTH, FEED_COMMENT_MESSAGES } from "../constants";

export class CreateFeedCommentDto {
  @IsString({ message: "O comentário deve ser um texto." })
  @MaxLength(FEED_COMMENT_MAX_LENGTH * 2, {
    message: FEED_COMMENT_MESSAGES.TOO_LONG,
  })
  content: string;
}
