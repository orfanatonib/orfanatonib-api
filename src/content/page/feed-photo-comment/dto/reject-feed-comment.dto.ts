import { Transform } from "class-transformer";
import { IsString, Length } from "class-validator";
import {
  FEED_COMMENT_MESSAGES,
  FEED_COMMENT_REASON_MAX_LENGTH,
} from "../constants";
import { trimText } from "../utils";

export class RejectFeedCommentDto {
  /** O autor recebe este motivo (na tela e por e-mail). */
  @Transform(trimText)
  @IsString({ message: FEED_COMMENT_MESSAGES.REASON_REQUIRED })
  @Length(1, FEED_COMMENT_REASON_MAX_LENGTH, {
    message: `${FEED_COMMENT_MESSAGES.REASON_REQUIRED} (até ${FEED_COMMENT_REASON_MAX_LENGTH} caracteres).`,
  })
  reason: string;
}
