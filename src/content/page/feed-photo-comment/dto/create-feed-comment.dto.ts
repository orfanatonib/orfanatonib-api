import { IsString, IsUUID, MaxLength } from "class-validator";
import { FEED_COMMENT_MAX_LENGTH, FEED_COMMENT_MESSAGES } from "../constants";

export class CreateFeedCommentDto {
  @IsString({ message: "O comentário deve ser um texto." })
  @MaxLength(FEED_COMMENT_MAX_LENGTH * 2, {
    message: FEED_COMMENT_MESSAGES.TOO_LONG,
  })
  content: string;

  /** Identifica o envio: repetir o mesmo `requestId` (reenvio) não duplica o comentário. */
  @IsUUID("4", { message: "requestId deve ser um UUID v4." })
  requestId: string;
}
